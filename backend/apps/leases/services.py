# Filename: backend/apps/leases/services.py

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


class _Missing:
    """Sentinel used to distinguish 'not provided' from explicit None."""
    pass


_MISSING = _Missing()


@dataclass(frozen=True)
class LeasePartyInput:
    """Input for attaching a tenant to a lease."""
    tenant_id: int
    role: str = LeaseTenant.Role.PRIMARY


# Step 1: Validate overlap + business invariants
def _validate_lease_invariants(
    *,
    org: Organization,
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    status: str,
    exclude_lease_id: Optional[int] = None,
) -> None:
    """Validate enterprise lease invariants.

    Rules:
      - end_date cannot be before start_date
      - no overlapping lease date ranges for the same unit
      - only one ACTIVE lease per unit at a time (status-driven)

    Args:
        org: Active organization (tenant boundary).
        unit: The unit the lease belongs to.
        start_date: Proposed start_date.
        end_date: Proposed end_date (None means open-ended).
        status: Proposed status.
        exclude_lease_id: Exclude a lease id (used for update).

    Raises:
        ValidationError: if any invariant is violated.
    """
    # Step 2: Date sanity
    if end_date is not None and end_date < start_date:
        raise ValidationError({"end_date": "end_date cannot be earlier than start_date."})

    qs = Lease.objects.filter(organization=org, unit=unit)
    if exclude_lease_id is not None:
        qs = qs.exclude(id=exclude_lease_id)

    # Step 3: Overlap detection (inclusive)
    # Overlap if:
    # existing.start <= new.end (or new.end open-ended)
    # AND new.start <= existing.end (or existing.end open-ended)
    new_end = end_date if end_date is not None else date.max

    overlap_q = Q(start_date__lte=new_end) & (Q(end_date__isnull=True) | Q(end_date__gte=start_date))

    if qs.filter(overlap_q).exists():
        raise ValidationError(
            {
                "non_field_errors": (
                    "Lease dates overlap with an existing lease for this unit. "
                    "A unit cannot have overlapping leases."
                )
            }
        )

    # Step 4: Single active lease (status-driven)
    # (You can later evolve this to derive 'active' from dates if you prefer.)
    if status == "active":
        active_qs = qs.filter(status="active")
        if active_qs.exists():
            raise ValidationError(
                {"status": "This unit already has an active lease. End it before activating another."}
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
    # Step 5: hard org integrity
    if unit.organization_id != org.id:
        raise ValidationError({"unit": "Unit must belong to the active organization."})

    # Step 6: invariants
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
def update_lease(
    *,
    org: Organization,
    lease: Lease,
    unit: Optional[Unit] = None,
    start_date: Optional[date] = None,
    end_date: object = _MISSING,  # ✅ correct sentinel default
    rent_amount: Optional[Decimal] = None,
    status: Optional[str] = None,
    security_deposit_amount: object = _MISSING,  # ✅ correct sentinel default
    rent_due_day: Optional[int] = None,
    parties: Optional[Iterable[LeasePartyInput]] = None,
) -> Lease:
    """Update a lease (org-safe) with PATCH semantics."""
    # Step 7: Org integrity
    if lease.organization_id != org.id:
        raise ValidationError({"detail": "Lease must belong to the active organization."})

    # Step 8: Resolve unit
    resolved_unit = unit or lease.unit
    if resolved_unit.organization_id != org.id:
        raise ValidationError({"unit": "Unit must belong to the active organization."})

    # Step 9: Compute proposed values (PATCH semantics)
    proposed_start = start_date if start_date is not None else lease.start_date
    proposed_end = lease.end_date if end_date is _MISSING else end_date  # may be None
    proposed_status = status if status is not None else lease.status

    # Step 10: invariants (exclude self)
    _validate_lease_invariants(
        org=org,
        unit=resolved_unit,
        start_date=proposed_start,
        end_date=proposed_end,
        status=proposed_status,
        exclude_lease_id=lease.id,
    )

    # Step 11: Apply updates
    if unit is not None:
        lease.unit = resolved_unit
    if start_date is not None:
        lease.start_date = proposed_start
    if end_date is not _MISSING:
        lease.end_date = proposed_end
    if rent_amount is not None:
        lease.rent_amount = rent_amount
    if security_deposit_amount is not _MISSING:
        lease.security_deposit_amount = security_deposit_amount  # may be None
    if rent_due_day is not None:
        lease.rent_due_day = rent_due_day
    if status is not None:
        lease.status = proposed_status

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
    LeaseTenant.objects.filter(organization=org, lease=lease).delete()

    tenant_ids = [p.tenant_id for p in parties]
    tenants: QuerySet[Tenant] = Tenant.objects.filter(organization=org, id__in=tenant_ids)
    tenant_map = {t.id: t for t in tenants}

    links = []
    for p in parties:
        tenant = tenant_map.get(p.tenant_id)
        if not tenant:
            raise ValidationError({"parties": f"Tenant {p.tenant_id} not found in this organization."})

        links.append(
            LeaseTenant(
                organization=org,
                lease=lease,
                tenant=tenant,
                role=p.role,
            )
        )

    LeaseTenant.objects.bulk_create(links)