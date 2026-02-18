
# Filename: backend/apps/leases/services.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable, Optional

from django.db import transaction
from django.db.models import QuerySet

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class LeasePartyInput:
    """Input for attaching a tenant to a lease."""
    tenant_id: int
    role: str = LeaseTenant.Role.PRIMARY


@transaction.atomic
def create_tenant(
    *,
    org: Organization,
    full_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Tenant:
    """Create a tenant within an organization."""
    # Step 1: server owns org scoping
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
    # Step 1: hard org integrity
    if unit.organization_id != org.id:
        raise ValueError("Unit must belong to the same organization as the lease.")

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
    unit: Unit,
    start_date: date,
    end_date: Optional[date],
    rent_amount: Decimal,
    status: str,
    security_deposit_amount: Optional[Decimal] = None,
    rent_due_day: int = 1,
    parties: Optional[Iterable[LeasePartyInput]] = None,
) -> Lease:
    """Update a lease (org-safe) and optional parties."""
    # Step 1: org integrity (caller already scoped lease, but unit must match org too)
    if lease.organization_id != org.id:
        raise ValueError("Lease must belong to the same organization as the request.")

    if unit.organization_id != org.id:
        raise ValueError("Unit must belong to the same organization as the lease.")

    lease.unit = unit
    lease.start_date = start_date
    lease.end_date = end_date
    lease.rent_amount = rent_amount
    lease.security_deposit_amount = security_deposit_amount
    lease.rent_due_day = rent_due_day
    lease.status = status
    lease.save()

    if parties is not None:
        # Step 2: if parties is provided (even empty), we treat it as authoritative
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
    tenants: QuerySet[Tenant] = Tenant.objects.filter(organization=org, id__in=tenant_ids)
    tenant_map = {t.id: t for t in tenants}

    links = []
    for p in parties:
        tenant = tenant_map.get(p.tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {p.tenant_id} not found in this organization.")

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
