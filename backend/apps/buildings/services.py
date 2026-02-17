# Filename: apps/buildings/services.py
from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.buildings.models import Building, Unit
from apps.core.models import Organization


@transaction.atomic
def create_building(*, org: Organization, data: dict[str, Any]) -> Building:
    """Create a building for the given org."""
    # Step 1: enforce org ownership server-side
    return Building.objects.create(organization=org, **data)


@transaction.atomic
def update_building(*, building: Building, data: dict[str, Any]) -> Building:
    """Update building fields (building is already org-scoped by the view)."""
    # Step 1: apply updates
    for field, value in data.items():
        setattr(building, field, value)
    building.save()
    return building


@transaction.atomic
def create_unit(*, org: Organization, data: dict[str, Any]) -> Unit:
    """Create a unit for the given org.

    Guards:
        - building must belong to org
        - unit.organization is forced to org
    """
    # Step 1: pop building and validate ownership
    building: Building = data["building"]
    if building.organization_id != org.id:
        raise ValidationError("Building belongs to a different organization.")

    # Step 2: create with enforced org
    return Unit.objects.create(organization=org, **data)


@transaction.atomic
def update_unit(*, unit: Unit, data: dict[str, Any]) -> Unit:
    """Update a unit (unit is already org-scoped by the view)."""
    # Step 1: prevent changing building across org via update
    if "building" in data:
        building: Building = data["building"]
        if building.organization_id != unit.organization_id:
            raise ValidationError("Building belongs to a different organization.")

    # Step 2: apply updates
    for field, value in data.items():
        setattr(unit, field, value)
    unit.save()
    return unit
