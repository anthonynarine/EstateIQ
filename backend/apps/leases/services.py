
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable, Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet

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


def _is_overlapping_end_exclusive(
    *,
    existing_start: date,
    existing_end: Optional[date],
    new_start: date,
    new_end: Optional[date],
) -> bool:
    """Return True if two [start, end) intervals overlap (end-exclusive).

    Rules:
      - end_date is exclusive
      - None end_date means open-ended (+∞)

    Overlap iff:
      new_start < existing_end_or_inf  AND  new_end_or_inf > existing_start
    """
    # Step 1: Handle infinity semantics
    existing_end_inf = existing_end
    new_end_inf = new_end

    # Step 2: Evaluate the canonical overlap formula with null-as-infinity
    left = True if existing_end_inf is None else (new_start < existing_end_inf)
    right = True if new_end_inf is None else (new_end_inf > existing_start)

    return left and right


def _find_conflicting_lease(
    *,
    org: Organization,
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    exclude_lease_id: Optional[int] = None,
) -> Optional[Lease]:
    """Return the first conflicting lease for this unit under end-exclusive semantics."""
    qs = Lease.objects.filter(organization=org, unit=unit).order_by("start_date", "id")
    if exclude_lease_id is not None:
        qs = qs.exclude(id=exclude_lease_id)

    # Step 1: Fetch candidates that *could* overlap (cheap DB filter, strict check in Python)
    #
    # For end-exclusive overlap, a safe candidate filter is:
    #   existing.start < new_end (if new_end is not null)
    #   AND (existing.end is null OR existing.end > new_start)
    #
    # If new_end is null (open-ended), we only need:
    #   existing.end is null OR existing.end > new_start
    candidates = qs.filter(Q(end_date__isnull=True) | Q(end_date__gt=start_date))

    if end_date is not None:
        candidates = candidates.filter(start_date__lt=end_date)

    # Step 2: Confirm overlap precisely (including adjacency allowance) in Python
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
    """Validate enterprise invariants for a lease before saving (end-exclusive).

    Invariants:
      - Unit must belong to org
      - If end_date provided, it must be strictly AFTER start_date (end-exclusive)
      - No overlapping lease ranges per unit under [start, end)
      - Only one ACTIVE lease per unit at a time

    Raises:
        ValidationError: If any invariant is violated (with structured details).
    """
    # Step 1: Org integrity
    if unit.organization_id != org.id:
        raise ValidationError(
            {
                "error": {
                    "code": "org_mismatch",
                    "message": "Unit must belong to the active organization.",
                    "details": {"unit_id": unit.id, "org_id": org.id},
                }
            }
        )

    # Step 2: Date sanity (end-exclusive)
    # end_date is the first day NOT occupied → must be > start_date if present.
    if end_date is not None and end_date <= start_date:
        raise ValidationError(
            {
                "error": {
                    "code": "invalid_date_range",
                    "message": "Move-out date must be after the start date.",
                    "details": {"start_date": start_date, "end_date": end_date},
                }
            }
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
        suggested_start = conflict.end_date  # adjacency allowed because end is exclusive
        raise ValidationError(
            {
                "error": {
                    "code": "lease_overlap",
                    "message": "Lease dates conflict with an existing lease for this unit.",
                    "details": {
                        "conflict": {
                            "lease_id": conflict.id,
                            "start_date": conflict.start_date,
                            "end_date": conflict.end_date,
                            "status": conflict.status,
                        },
                        "suggested_start_date": suggested_start,
                        "rule": "[start_date, end_date) end-exclusive",
                    },
                }
            }
        )

    # Step 4: Only one ACTIVE lease per unit (status-driven)
    if status == Lease.Status.ACTIVE:
        active_qs = Lease.objects.filter(
            organization=org,
            unit=unit,
            status=Lease.Status.ACTIVE,
        )
        if exclude_lease_id is not None:
            active_qs = active_qs.exclude(id=exclude_lease_id)

        if active_qs.exists():
            raise ValidationError(
                {
                    "error": {
                        "code": "active_lease_exists",
                        "message": "This unit already has an active lease. End it before activating another.",
                        "details": {"unit_id": unit.id},
                    }
                }
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

    if parties:
        _set_lease_parties(org=org, lease=lease, parties=parties)

    return lease


@transaction.atomic
def end_lease(
    *,
    org: Organization,
    lease: Lease,
    end_date: date,
) -> Lease:
    """End a lease by setting a concrete end_date (exclusive) and status=ENDED.

    end_date is the move-out date (tenant does NOT occupy on this date).
    """
    # Step 1: Org integrity
    if lease.organization_id != org.id:
        raise ValidationError(
            {
                "error": {
                    "code": "org_mismatch",
                    "message": "Lease must belong to the active organization.",
                    "details": {"lease_id": lease.id, "org_id": org.id},
                }
            }
        )

    # Step 2: Validate end-exclusive date rule
    if end_date <= lease.start_date:
        raise ValidationError(
            {
                "error": {
                    "code": "invalid_end_date",
                    "message": "Move-out date must be after the start date.",
                    "details": {"start_date": lease.start_date, "end_date": end_date},
                }
            }
        )

    # Step 3: Apply end state deterministically
    lease.end_date = end_date
    lease.status = Lease.Status.ENDED
    lease.save()

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
        raise ValidationError(
            {
                "error": {
                    "code": "org_mismatch",
                    "message": "Lease must belong to the active organization.",
                    "details": {"lease_id": lease.id, "org_id": org.id},
                }
            }
        )

    # Step 2: Resolve effective unit
    resolved_unit = unit or lease.unit
    if resolved_unit.organization_id != org.id:
        raise ValidationError(
            {
                "error": {
                    "code": "org_mismatch",
                    "message": "Unit must belong to the active organization.",
                    "details": {"unit_id": resolved_unit.id, "org_id": org.id},
                }
            }
        )

    # Step 3: Compute effective values (PATCH semantics)
    effective_start = start_date if start_date is not None else lease.start_date

    if end_date is _MISSING:
        effective_end = lease.end_date
    else:
        effective_end = end_date  # may be None (explicit clear)

    effective_status = status if status is not None else lease.status

    # Step 4: Validate invariants using effective values (end-exclusive)
    _validate_lease_invariants(
        org=org,
        unit=resolved_unit,
        start_date=effective_start,
        end_date=effective_end,
        status=effective_status,
        exclude_lease_id=lease.id,
    )

    # Step 5: Apply updates after validation
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

    if parties is not None:
        _set_lease_parties(org=org, lease=lease, parties=parties)

    return lease


def _set_lease_parties(
    *,
    org: Organization,
    lease: Lease,
    parties: Iterable[LeasePartyInput],
) -> None:
    """Replace lease parties with the provided list (authoritative)."""
    # Step 1: delete existing
    LeaseTenant.objects.filter(organization=org, lease=lease).delete()

    # Step 2: ensure tenants exist in org
    tenant_ids = [p.tenant_id for p in parties]
    tenants: QuerySet[Tenant] = Tenant.objects.filter(
        organization=org,
        id__in=tenant_ids,
    )
    tenant_map = {t.id: t for t in tenants}

    links = []
    for p in parties:
        tenant = tenant_map.get(p.tenant_id)
        if not tenant:
            raise ValidationError(
                {
                    "error": {
                        "code": "tenant_not_found",
                        "message": "Tenant not found in this organization.",
                        "details": {"tenant_id": p.tenant_id},
                    }
                }
            )

        links.append(
            LeaseTenant(
                organization=org,
                lease=lease,
                tenant=tenant,
                role=p.role,
            )
        )

    # Step 3: bulk create
    LeaseTenant.objects.bulk_create(links)