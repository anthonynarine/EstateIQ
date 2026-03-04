
from __future__ import annotations

from datetime import date

from django.db.models import Exists, OuterRef, QuerySet, Subquery, Q
from django.utils import timezone

from apps.buildings.models import Building, Unit
from apps.core.models import Organization
from apps.leases.models import Lease, Tenant


def buildings_qs_for_org(*, org: Organization) -> QuerySet[Building]:
    """Return buildings scoped to an organization."""
    return Building.objects.filter(organization=org).order_by("-created_at")


def active_lease_today_q(*, today: date) -> Q:
    """Return Q() expressing 'active today' under end-exclusive semantics.

    Business rule:
      - Lease interval is [start_date, end_date)
      - end_date is the move-out date (tenant does NOT occupy on end_date)
      - None end_date means open-ended

    Active on 'today' iff:
      start_date <= today AND (end_date is null OR today < end_date)

    Usage:
      Lease.objects.filter(start_date__lte=today).filter(active_lease_today_q(today=today))
    """
    # Step 1: end_date is exclusive => use GT (not GTE)
    return Q(end_date__isnull=True) | Q(end_date__gt=today)


def leases_qs(*, org: Organization) -> QuerySet[Lease]:
    """Return org-scoped leases queryset."""
    return (
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related("parties__tenant")
        .order_by("-created_at")
    )


def tenants_qs(*, org: Organization) -> QuerySet[Tenant]:
    """Return org-scoped tenants queryset."""
    return Tenant.objects.filter(organization=org).order_by("-created_at")


def _annotate_units_with_occupancy(*, org: Organization, qs: QuerySet[Unit]) -> QuerySet[Unit]:
    """Annotate units with deterministic occupancy (org-safe)."""
    # Step 1: Resolve today deterministically (server-local date)
    today = timezone.localdate()

    # Step 2: "Active today" lease subquery (scoped to org + current unit)
    active_today_lease = (
        Lease.objects.filter(
            organization=org,
            unit_id=OuterRef("pk"),
            status=Lease.Status.ACTIVE,
            start_date__lte=today,
        )
        .filter(active_lease_today_q(today=today))
        .order_by("-start_date", "-id")
    )

    # Step 3: Annotate fields
    return qs.annotate(
        is_occupied=Exists(active_today_lease),
        active_lease_id=Subquery(active_today_lease.values("id")[:1]),
    )


def units_qs_for_org(*, org: Organization) -> QuerySet[Unit]:
    """Return units scoped to an organization, annotated with occupancy."""
    qs = Unit.objects.select_related("building").filter(organization=org)
    return _annotate_units_with_occupancy(org=org, qs=qs).order_by("-created_at")


def building_units_qs_for_org(*, org: Organization, building_id: int) -> QuerySet[Unit]:
    """Return units for a single building, scoped to org, annotated with occupancy."""
    return units_qs_for_org(org=org).filter(building_id=building_id)


def building_units_with_occupancy_qs_for_org(*, org: Organization, building_id: int) -> QuerySet[Unit]:
    """Backward-compatible helper (same output as building_units_qs_for_org)."""
    return building_units_qs_for_org(org=org, building_id=building_id)