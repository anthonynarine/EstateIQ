# Filename: apps/buildings/services.py
# ✅ New Code
from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.buildings.exceptions import DomainValidationError
from apps.buildings.models import Building, Unit
from apps.core.models import Organization


@transaction.atomic
def create_building(*, org: Organization, data: dict[str, Any]) -> Building:
    # Step 1: enforce org ownership server-side
    return Building.objects.create(organization=org, **data)


@transaction.atomic
def update_building(*, building: Building, data: dict[str, Any]) -> Building:
    # Step 1: apply updates
    for field, value in data.items():
        setattr(building, field, value)
    building.save()
    return building


@transaction.atomic
def create_unit(*, org: Organization, data: dict[str, Any]) -> Unit:
    # Step 1: validate building belongs to org
    building: Building = data["building"]
    if building.organization_id != org.id:
        raise DomainValidationError(
            {"building": ["Building belongs to a different organization."]}
        )

    # Step 2: create with enforced org
    return Unit.objects.create(organization=org, **data)


@transaction.atomic
def update_unit(*, unit: Unit, data: dict[str, Any]) -> Unit:
    # Step 1: prevent cross-tenant reassignment via update
    if "building" in data:
        building: Building = data["building"]
        if building.organization_id != unit.organization_id:
            raise DomainValidationError(
                {"building": ["Building belongs to a different organization."]}
            )

    # Step 2: apply updates
    for field, value in data.items():
        setattr(unit, field, value)
    unit.save()
    return unit
