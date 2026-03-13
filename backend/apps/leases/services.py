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
    """Raise a DRFValidationError with a consistent structured payload."""
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
    """Return True if two [start, end) intervals overlap (end-exclusive)."""
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
    """Return the first lease that conflicts with the proposed interval [start, end)."""
    # Step 1: Base queryset (org-safe)
    qs = Lease.objects.filter(organization=org, unit=unit).order_by("start_date", "id")
    if exclude_lease_id is not None:
        qs = qs.exclude(id=exclude_lease_id)

    # Step 2: Candidate DB filter (cheap; final decision in Python)
    candidates = qs.filter(Q(end_date__isnull=True) | Q(end_date__gt=start_date))
    if end_date is not None:
        candidates = candidates.filter(start_date__lt=end_date)

    # Step 3: Precise overlap check
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

    # Step 2: Date sanity
    if end_date is not None and end_date <= start_date:
        _raise_api_error(
            code="invalid_date_range",
            message="Move-out date must be after the start date.",
            details={"start_date": str(start_date), "end_date": str(end_date)},
        )

    # Step 3: Overlap detection
    conflict = _find_conflicting_lease(
        org=org,
        unit=unit,
        start_date=start_date,
        end_date=end_date,
        exclude_lease_id=exclude_lease_id,
    )
    if conflict is not None:
        suggested_start = conflict.end_date
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


def _normalize_parties(parties: Iterable[LeasePartyInput]) -> list[LeasePartyInput]:
    """Materialize party inputs into a list."""
    # Step 1: Convert iterable to list so we can validate deterministically
    return list(parties)


def _validate_party_inputs(
    *,
    parties: list[LeasePartyInput],
    require_primary: bool = True,
) -> None:
    """Validate authoritative lease party input before any destructive writes."""
    # Step 1: Require at least one party
    if not parties:
        _raise_api_error(
            code="primary_tenant_required",
            message="A lease must have a primary tenant.",
            details={},
        )

    # Step 2: Block duplicate tenant IDs
    tenant_ids = [party.tenant_id for party in parties]
    duplicate_ids = sorted({tenant_id for tenant_id in tenant_ids if tenant_ids.count(tenant_id) > 1})
    if duplicate_ids:
        _raise_api_error(
            code="duplicate_lease_tenants",
            message="Each tenant may only appear once on a lease.",
            details={"tenant_ids": duplicate_ids},
        )

    # Step 3: Enforce exactly one primary tenant
    primary_count = sum(1 for party in parties if party.role == LeaseTenant.Role.PRIMARY)
    if require_primary and primary_count != 1:
        _raise_api_error(
            code="invalid_primary_tenant_count",
            message="A lease must have exactly one primary tenant.",
            details={"primary_count": primary_count},
        )


def _assert_lease_has_primary_tenant(*, org: Organization, lease: Lease) -> None:
    """Ensure the persisted lease still has exactly one primary tenant link."""
    # Step 1: Count primary links
    primary_count = LeaseTenant.objects.filter(
        organization=org,
        lease=lease,
        role=LeaseTenant.Role.PRIMARY,
    ).count()

    # Step 2: Enforce exact cardinality
    if primary_count != 1:
        _raise_api_error(
            code="primary_tenant_required",
            message="A lease must have exactly one primary tenant.",
            details={"lease_id": lease.id, "primary_count": primary_count},
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
    """Create a lease and its tenant links atomically."""
    # Step 1: Require and validate parties up front
    normalized_parties = _normalize_parties(parties or [])
    _validate_party_inputs(parties=normalized_parties)

    # Step 2: Validate lease invariants before save
    _validate_lease_invariants(
        org=org,
        unit=unit,
        start_date=start_date,
        end_date=end_date,
        status=status,
        exclude_lease_id=None,
    )

    # Step 3: Persist lease
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

    # Step 4: Persist authoritative parties
    _set_lease_parties(org=org, lease=lease, parties=normalized_parties)

    # Step 5: Final guardrail
    _assert_lease_has_primary_tenant(org=org, lease=lease)

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
    """Update a lease atomically with true PATCH semantics."""
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

    # Step 3: Compute effective values
    effective_start = start_date if start_date is not None else lease.start_date
    effective_end = lease.end_date if end_date is _MISSING else end_date
    effective_status = status if status is not None else lease.status

    # Step 4: Validate invariants
    _validate_lease_invariants(
        org=org,
        unit=resolved_unit,
        start_date=effective_start,
        end_date=effective_end,
        status=effective_status,
        exclude_lease_id=lease.id,
    )

    # Step 5: Apply lease field updates
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

    # Step 6: Replace parties only if explicitly provided
    if parties is not None:
        normalized_parties = _normalize_parties(parties)
        _validate_party_inputs(parties=normalized_parties)
        _set_lease_parties(org=org, lease=lease, parties=normalized_parties)

    # Step 7: Never allow the lease to remain in an invalid legacy state
    _assert_lease_has_primary_tenant(org=org, lease=lease)

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

    # Step 2: End date sanity
    if end_date <= lease.start_date:
        _raise_api_error(
            code="invalid_end_date",
            message="Move-out date must be after the start date.",
            details={"start_date": str(lease.start_date), "end_date": str(end_date)},
        )

    # Step 3: Apply end state
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
    """Replace lease parties authoritatively after validation."""
    # Step 1: Materialize and validate before destructive work
    normalized_parties = _normalize_parties(parties)
    _validate_party_inputs(parties=normalized_parties)

    # Step 2: Resolve tenants within org
    tenant_ids = [party.tenant_id for party in normalized_parties]
    tenants: QuerySet[Tenant] = Tenant.objects.filter(
        organization=org,
        id__in=tenant_ids,
    )
    tenant_map = {tenant.id: tenant for tenant in tenants}

    missing_tenant_ids = sorted(set(tenant_ids) - set(tenant_map.keys()))
    if missing_tenant_ids:
        _raise_api_error(
            code="tenant_not_found",
            message="One or more tenants were not found in this organization.",
            details={"tenant_ids": missing_tenant_ids},
        )

    # Step 3: Remove existing party rows only after validation succeeds
    LeaseTenant.objects.select_for_update().filter(
        organization=org,
        lease=lease,
    ).delete()

    # Step 4: Build new rows
    links: list[LeaseTenant] = []
    for party in normalized_parties:
        links.append(
            LeaseTenant(
                organization=org,
                lease=lease,
                tenant=tenant_map[party.tenant_id],
                role=party.role,
            )
        )

    # Step 5: Bulk create authoritative rows
    LeaseTenant.objects.bulk_create(links)