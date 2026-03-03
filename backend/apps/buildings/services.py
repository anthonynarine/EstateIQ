# Filename: backend/apps/buildings/services.py

from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.buildings.models import Building, Unit

if TYPE_CHECKING:
    # Step 1: Type-only import to keep runtime imports clean
    from apps.core.models import Organization


@transaction.atomic
def update_building(*, org: "Organization", instance: Building, data: Dict[str, Any]) -> Building:
    """Update a building (org-safe).

    Args:
        org: Tenant boundary.
        instance: Building instance already filtered by org queryset.
        data: Serializer validated_data.

    Returns:
        Updated Building.
    """
    # Step 1: Never allow tenant fields to be mutated via payload
    payload = dict(data)
    payload.pop("organization", None)

    # Step 2: Apply updates
    for field, value in payload.items():
        setattr(instance, field, value)

    # Step 3: Persist
    instance.save()
    return instance


@transaction.atomic
def create_unit(*, org: "Organization", data: Dict[str, Any]) -> Unit:
    """Create a unit (org-safe).

    Enforces:
    - organization derived from request.org
    - building belongs to org
    - model validation errors -> DRF 400
    """
    # Step 1: Copy + sanitize incoming data
    payload = dict(data)
    payload.pop("organization", None)

    # Step 2: Force org (canonical tenant source)
    payload["organization"] = org

    # Step 3: Enforce tenant boundary (building must belong to org)
    building = payload.get("building")
    if building is not None and getattr(building, "organization_id", None) != getattr(org, "id", None):
        raise DRFValidationError({"building": "Building does not belong to this organization."})

    # Step 4: Create safely (convert model validation -> DRF 400)
    try:
        return Unit.objects.create(**payload)
    except ValidationError as exc:
        raise DRFValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))


@transaction.atomic
def update_unit(*, org: "Organization", instance: Unit, data: Dict[str, Any]) -> Unit:
    """Update a unit (org-safe).

    Security/integrity rules:
    - Never allow tenant mutation via payload.
    - Never allow moving a unit across buildings via this service.
      (If you ever want "transfer unit", implement a dedicated, audited endpoint.)
    """
    # Step 1: Copy + sanitize incoming data
    payload = dict(data)
    payload.pop("organization", None)

    # Step 2: Prevent building reassignment (defense in depth)
    if "building" in payload and payload["building"] is not None:
        incoming_building = payload["building"]
        if incoming_building.id != instance.building_id:
            raise DRFValidationError({"building": "Building cannot be changed after unit creation."})

    # Step 3: Apply updates
    for field, value in payload.items():
        setattr(instance, field, value)

    # Step 4: Persist (Unit.save() will run full_clean)
    try:
        instance.save()
    except ValidationError as exc:
        raise DRFValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))

    return instance
