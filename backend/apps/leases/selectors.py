
from __future__ import annotations

from datetime import date
from typing import Optional

from django.db.models import Prefetch, Q, QuerySet
from django.utils import timezone

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


def tenants_qs(*, org: Organization) -> QuerySet[Tenant]:
    """Return org-scoped tenants queryset.

    Notes:
        - Always org-scoped (multi-tenant safe).
        - Ordered newest first for admin screens.
    """
    return Tenant.objects.filter(organization=org).order_by("-created_at", "-id")


def tenant_by_id(*, org: Organization, tenant_id: int) -> Optional[Tenant]:
    """Return a tenant by id (org-scoped), or None if not found."""
    return Tenant.objects.filter(organization=org, id=tenant_id).first()


def units_qs(*, org: Organization) -> QuerySet[Unit]:
    """Return org-scoped units queryset (used for validation and foreign key checks)."""
    return Unit.objects.filter(organization=org).select_related("building").order_by("id")


def lease_parties_qs(*, org: Organization) -> QuerySet[LeaseTenant]:
    """Return org-scoped lease parties queryset.

    Notes:
        - Prefers select_related for tenant display.
        - Ordered by role for stable UI rendering.
    """
    return (
        LeaseTenant.objects.filter(organization=org)
        .select_related("tenant", "lease")
        .order_by("lease_id", "role", "id")
    )


def leases_qs(*, org: Organization) -> QuerySet[Lease]:
    """Return org-scoped leases queryset with UI-friendly joins.

    Includes:
        - unit + building (select_related)
        - parties + tenant (prefetch_related)

    Notes:
        - This is the canonical selector used by LeaseViewSet.
        - Keep ordering stable for consistent paging/UI.
    """
    parties_prefetch = Prefetch(
        "parties",
        queryset=LeaseTenant.objects.select_related("tenant").order_by("role", "id"),
    )

    return (
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related(parties_prefetch)
        .order_by("-created_at", "-id")
    )


def leases_for_unit_qs(*, org: Organization, unit_id: int) -> QuerySet[Lease]:
    """Return all leases for a unit (org-scoped)."""
    return leases_qs(org=org).filter(unit_id=unit_id)


def leases_for_building_qs(*, org: Organization, building_id: int) -> QuerySet[Lease]:
    """Return all leases for a building (org-scoped)."""
    return leases_qs(org=org).filter(unit__building_id=building_id)


def active_lease_today_q(*, today: date) -> Q:
    """Return Q() for 'active on today' under end-exclusive semantics.

    Lease interval: [start_date, end_date)
    Active on today iff:
        start_date <= today AND (end_date is null OR today < end_date)
    """
    # Step 1: end_date is exclusive => use GT (not GTE)
    return Q(end_date__isnull=True) | Q(end_date__gt=today)


def active_leases_today_qs(*, org: Organization, today: Optional[date] = None) -> QuerySet[Lease]:
    """Return ACTIVE leases that are active on `today` under end-exclusive semantics."""
    # Step 1: default date
    d = today or timezone.localdate()

    # Step 2: compose with the shared predicate helper
    return (
        leases_qs(org=org)
        .filter(status=Lease.Status.ACTIVE, start_date__lte=d)
        .filter(active_lease_today_q(today=d))
    )