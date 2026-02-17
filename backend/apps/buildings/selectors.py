# Filename: apps/buildings/selectors.py
from __future__ import annotations

from django.db.models import QuerySet

from apps.buildings.models import Building, Unit
from apps.core.models import Organization


def buildings_qs_for_org(*, org: Organization) -> QuerySet[Building]:
    """Return buildings scoped to an organization."""
    return Building.objects.filter(organization=org).order_by("-created_at")


def units_qs_for_org(*, org: Organization) -> QuerySet[Unit]:
    """Return units scoped to an organization."""
    return Unit.objects.select_related("building").filter(organization=org).order_by(
        "-created_at"
    )


def building_units_qs_for_org(*, org: Organization, building_id: int) -> QuerySet[Unit]:
    """Return units for a single building, scoped to org."""
    return units_qs_for_org(org=org).filter(building_id=building_id)
