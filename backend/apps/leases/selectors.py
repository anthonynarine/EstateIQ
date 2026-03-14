# Filename: apps/leases/selectors.py

from __future__ import annotations

from datetime import date
from typing import Optional

from django.db.models import Prefetch, Q, QuerySet
from django.utils import timezone

from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant


def leases_qs(*, org: Organization) -> QuerySet[Lease]:
    """Return the canonical org-scoped lease queryset.

    Includes:
        - unit + building via select_related
        - lease parties + tenant via prefetch_related

    Args:
        org: Organization that owns the lease records.

    Returns:
        QuerySet[Lease]: Stable, org-scoped queryset for lease reads.
    """
    # Step 1: Prefetch lease parties with tenant records for rich read APIs
    parties_prefetch = Prefetch(
        "parties",
        queryset=LeaseTenant.objects.select_related("tenant").order_by("role", "id"),
    )

    # Step 2: Return the canonical lease queryset
    return (
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related(parties_prefetch)
        .order_by("-created_at", "-id")
    )


def leases_for_unit_qs(*, org: Organization, unit_id: int) -> QuerySet[Lease]:
    """Return all leases for a single unit, scoped to an organization.

    Args:
        org: Organization that owns the records.
        unit_id: Unit primary key.

    Returns:
        QuerySet[Lease]: Org-scoped lease history for the unit.
    """
    # Step 1: Reuse the canonical selector and apply the unit filter
    return leases_qs(org=org).filter(unit_id=unit_id)


def leases_for_building_qs(*, org: Organization, building_id: int) -> QuerySet[Lease]:
    """Return all leases for a single building, scoped to an organization.

    Args:
        org: Organization that owns the records.
        building_id: Building primary key.

    Returns:
        QuerySet[Lease]: Org-scoped leases for units in the building.
    """
    # Step 1: Reuse the canonical selector and apply the building filter
    return leases_qs(org=org).filter(unit__building_id=building_id)


def active_lease_today_q(*, today: date) -> Q:
    """Return the shared active-lease predicate for a specific date.

    Lease interval semantics in this codebase should be treated as:

        [start_date, end_date)

    That means:
        - start_date is inclusive
        - end_date is exclusive
        - a lease ending on `today` is no longer active on `today`
        - an open-ended lease (end_date is null) remains active

    This matches the current building occupancy logic and prevents subtle
    disagreement between building summary counts and unit-level occupancy.

    Args:
        today: The date for which we want to evaluate lease activity.

    Returns:
        Q: Predicate representing "lease is active on today".
    """
    # Step 1: Open-ended leases are active
    # Step 2: Otherwise the lease must end after today (end-exclusive)
    return Q(end_date__isnull=True) | Q(end_date__gt=today)


def active_leases_today_qs(
    *,
    org: Organization,
    today: Optional[date] = None,
) -> QuerySet[Lease]:
    """Return ACTIVE leases that are active on the given date.

    Args:
        org: Organization that owns the records.
        today: Optional evaluation date. Defaults to the local current date.

    Returns:
        QuerySet[Lease]: Org-scoped leases active on the target date.
    """
    # Step 1: Resolve the evaluation date
    resolved_today = today or timezone.localdate()

    # Step 2: Apply the shared active predicate
    return (
        leases_qs(org=org)
        .filter(
            status=Lease.Status.ACTIVE,
            start_date__lte=resolved_today,
        )
        .filter(active_lease_today_q(today=resolved_today))
    )