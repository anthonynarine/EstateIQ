# Filename: backend/apps/leases/services.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable, Optional

from django.db import transaction
from django.db.models import Q, QuerySet
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class LeasePartyInput:
    """Input for attaching a tenant to a lease."""
    tenant_id: int
    role: str = LeaseTenant.Role.PRIMARY


class _Missing:
    """Sentinel for PATCH fields that were not provided."""
    pass


_MISSING = _Missing()


def _raise_api_error(*, code: str, message: str, details: dict) -> None:
    """Raise a DRFValidationError with a consistent structured payload.

    We use DRFValidationError here (not Django ValidationError) because:
      - We want to return a structured JSON payload to the frontend.
      - Django ValidationError does NOT reliably support nested dict values.
      - This avoids the `'ValidationError' object has no attribute 'error_list'` crash.
    """
    # Step 1: Raise API-safe structured payload
    raise DRFValidationError(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        }
    )


def _is_overlapping_end_exclusive(
    *,
    existing_start: date,
    existing_end: Optional[date],
    new_start: date,
    new_end: Optional[date],
) -> bool:
    """Return True if two [start, end) intervals overlap (end-exclusive).

    Business rule:
      - Lease covers [start_date, end_date)
      - end_date is exclusive (move-out date)
      - None end_date means open-ended (+∞)

    Overlap iff:
      new_start < existing_end_or_inf  AND  new_end_or_inf > existing_start
    """
    # Step 1: Compute left condition: new_start < existing_end_or_inf
    left = True if existing_end is None else (new_start < existing_end)

    # Step 2: Compute right condition: new_end_or_inf > existing_start
    right = True if new_end is None else (new_end > existing_start)

    return left and right


def _find_conflicting_lease(
    *,
    org: Organization,
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    exclude_lease_id: Optional[int] = None,
) -> Optional[Lease]:
    """Return the first lease that conflicts with the proposed interval [start, end).

    This function enforces end-exclusive overlap logic and adjacency allowance.
    """
    # Step 1: Base queryset (org-safe)
    qs = Lease.objects.filter(organization=org, unit=unit).order_by("start_date", "id")
    if exclude_lease_id is not None:
        qs = qs.exclude(id=exclude_lease_id)

    # Step 2: Candidate DB filter (cheap; final decision in Python)
    #
    # Overlap conditions:
    #   new_start < existing_end_or_inf  -> existing_end is null OR existing_end > new_start
    #   new_end_or_inf > existing_start  -> if new_end exists, existing_start < new_end
    candidates = qs.filter(Q(end_date__isnull=True) | Q(end_date__gt=start_date))
    if end_date is not None:
        candidates = candidates.filter(start_date__lt=end_date)

    # Step 3: Precise overlap check (handles adjacency correctly)
    for existing in candidates:
        if _is_overlapping_end_exclusive(
            existing_start=existing.start_date,
            existing_end=existing.end_date,
            new_start=start_date,
            new_end=end_date,
        ):
            return existing

    return None


def _validate_lease_invariants(
    *,
    org: Organization,
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    status: str,
    exclude_lease_id: Optional[int] = None,
) -> None:
    """Validate enterprise invariants for a lease (end-exclusive semantics)."""
    # Step 1: Org integrity
    if unit.organization_id != org.id:
        _raise_api_error(
            code="org_mismatch",
            message="Unit must belong to the active organization.",
            details={"unit_id": unit.id, "org_id": org.id},
        )

    # Step 2: Date sanity (end-exclusive)
    # end_date is the move-out date (tenant does NOT occupy on end_date),
    # so it must be strictly AFTER start_date.
    if end_date is not None and end_date <= start_date:
        _raise_api_error(
            code="invalid_date_range",
            message="Move-out date must be after the start date.",
            details={"start_date": str(start_date), "end_date": str(end_date)},
        )

    # Step 3: Overlap detection (end-exclusive)
    conflict = _find_conflicting_lease(
        org=org,
        unit=unit,
        start_date=start_date,
        end_date=end_date,
        exclude_lease_id=exclude_lease_id,
    )
    if conflict is not None:
        suggested_start = conflict.end_date  # adjacency allowed under end-exclusive rule
        _raise_api_error(
            code="lease_overlap",
            message="Lease dates conflict with an existing lease for this unit.",
            details={
                "conflict": {
                    "lease_id": conflict.id,
                    "start_date": str(conflict.start_date),
                    "end_date": str(conflict.end_date) if conflict.end_date else None,
                    "status": conflict.status,
                },
                "suggested_start_date": str(suggested_start) if suggested_start else None,
                "rule": "[start_date, end_date) end-exclusive",
            },
        )

    # Step 4: Only one ACTIVE lease per unit at a time
    if status == Lease.Status.ACTIVE:
        active_qs = Lease.objects.filter(
            organization=org,
            unit=unit,
            status=Lease.Status.ACTIVE,
        )
        if exclude_lease_id is not None:
            active_qs = active_qs.exclude(id=exclude_lease_id)

        if active_qs.exists():
            _raise_api_error(
                code="active_lease_exists",
                message="This unit already has an active lease. End it before activating another.",
                details={"unit_id": unit.id},
            )


@transaction.atomic
def create_tenant(
    *,
    org: Organization,
    full_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Tenant:
    """Create a tenant within an organization."""
    # Step 1: Create row
    tenant = Tenant(
        organization=org,
        full_name=full_name,
        email=email,
        phone=phone,
    )
    tenant.save()
    return tenant


@transaction.atomic
def update_tenant(
    *,
    tenant: Tenant,
    full_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Tenant:
    """Update a tenant (already org-scoped by caller)."""
    # Step 1: Apply updates
    tenant.full_name = full_name
    tenant.email = email
    tenant.phone = phone
    tenant.save()
    return tenant


@transaction.atomic
def create_lease(
    *,
    org: Organization,
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    rent_amount: Decimal,
    status: str,
    security_deposit_amount: Optional[Decimal] = None,
    rent_due_day: int = 1,
    parties: Optional[Iterable[LeasePartyInput]] = None,
) -> Lease:
    """Create a lease (org-safe) and optional parties."""
    # Step 1: Validate invariants pre-save
    _validate_lease_invariants(
        org=org,
        unit=unit,
        start_date=start_date,
        end_date=end_date,
        status=status,
        exclude_lease_id=None,
    )

    # Step 2: Persist lease
    lease = Lease(
        organization=org,
        unit=unit,
        start_date=start_date,
        end_date=end_date,
        rent_amount=rent_amount,
        security_deposit_amount=security_deposit_amount,
        rent_due_day=rent_due_day,
        status=status,
    )
    lease.save()

    # Step 3: Attach parties if present
    if parties:
        _set_lease_parties(org=org, lease=lease, parties=parties)

    return lease


@transaction.atomic
def update_lease(
    *,
    org: Organization,
    lease: Lease,
    unit: Optional[Unit] = None,
    start_date: Optional[date] = None,
    end_date: object = _MISSING,
    rent_amount: Optional[Decimal] = None,
    status: Optional[str] = None,
    security_deposit_amount: object = _MISSING,
    rent_due_day: Optional[int] = None,
    parties: Optional[Iterable[LeasePartyInput]] = None,
) -> Lease:
    """Update a lease (org-safe) with true PATCH semantics."""
    # Step 1: Org integrity
    if lease.organization_id != org.id:
        _raise_api_error(
            code="org_mismatch",
            message="Lease must belong to the active organization.",
            details={"lease_id": lease.id, "org_id": org.id},
        )

    # Step 2: Resolve effective unit
    resolved_unit = unit or lease.unit
    if resolved_unit.organization_id != org.id:
        _raise_api_error(
            code="org_mismatch",
            message="Unit must belong to the active organization.",
            details={"unit_id": resolved_unit.id, "org_id": org.id},
        )

    # Step 3: Compute effective values (PATCH semantics)
    effective_start = start_date if start_date is not None else lease.start_date
    effective_end = lease.end_date if end_date is _MISSING else end_date
    effective_status = status if status is not None else lease.status

    # Step 4: Validate invariants using effective values
    _validate_lease_invariants(
        org=org,
        unit=resolved_unit,
        start_date=effective_start,
        end_date=effective_end,
        status=effective_status,
        exclude_lease_id=lease.id,
    )

    # Step 5: Apply updates
    if unit is not None:
        lease.unit = resolved_unit
    if start_date is not None:
        lease.start_date = effective_start
    if end_date is not _MISSING:
        lease.end_date = effective_end
    if rent_amount is not None:
        lease.rent_amount = rent_amount
    if security_deposit_amount is not _MISSING:
        lease.security_deposit_amount = security_deposit_amount
    if rent_due_day is not None:
        lease.rent_due_day = rent_due_day
    if status is not None:
        lease.status = effective_status

    lease.save()

    # Step 6: Replace parties if explicitly provided
    if parties is not None:
        _set_lease_parties(org=org, lease=lease, parties=parties)

    return lease


@transaction.atomic
def end_lease(
    *,
    org: Organization,
    lease: Lease,
    end_date: date,
) -> Lease:
    """End a lease by setting a concrete end_date (exclusive) and status=ENDED."""
    # Step 1: Org integrity
    if lease.organization_id != org.id:
        _raise_api_error(
            code="org_mismatch",
            message="Lease must belong to the active organization.",
            details={"lease_id": lease.id, "org_id": org.id},
        )

    # Step 2: End-exclusive date rule
    # end_date is the move-out date, so it must be strictly after start_date.
    if end_date <= lease.start_date:
        _raise_api_error(
            code="invalid_end_date",
            message="Move-out date must be after the start date.",
            details={"start_date": str(lease.start_date), "end_date": str(end_date)},
        )

    # Step 3: Apply end state deterministically
    lease.end_date = end_date
    lease.status = Lease.Status.ENDED
    lease.save()

    return lease


def _set_lease_parties(
    *,
    org: Organization,
    lease: Lease,
    parties: Iterable[LeasePartyInput],
) -> None:
    """Replace lease parties with the provided list (authoritative)."""
    # Step 1: Delete existing parties
    LeaseTenant.objects.filter(organization=org, lease=lease).delete()

    # Step 2: Resolve tenants within org
    tenant_ids = [p.tenant_id for p in parties]
    tenants: QuerySet[Tenant] = Tenant.objects.filter(organization=org, id__in=tenant_ids)
    tenant_map = {t.id: t for t in tenants}

    # Step 3: Build links
    links: list[LeaseTenant] = []
    for p in parties:
        tenant = tenant_map.get(p.tenant_id)
        if not tenant:
            _raise_api_error(
                code="tenant_not_found",
                message="Tenant not found in this organization.",
                details={"tenant_id": p.tenant_id},
            )

        links.append(
            LeaseTenant(
                organization=org,
                lease=lease,
                tenant=tenant,
                role=p.role,
            )
        )

    # Step 4: Bulk create
    LeaseTenant.objects.bulk_create(links)