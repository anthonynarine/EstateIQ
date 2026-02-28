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

    # Step 3: Persist (Building.save() can enforce any invariants you have)
    instance.save()
    return instance


@transaction.atomic
def create_unit(*, org: "Organization", data: Dict[str, Any]) -> Unit:
    """Create a unit (org-safe).

    This prevents the 500 you saw:
    ValidationError: {'organization': ['This field cannot be null.']}

    Why it happened:
        - Unit.save() calls full_clean()
        - organization is required
        - serializer.validated_data did not include organization
        - model validation raised and bubbled up

    What we do here:
        - Force organization from request.org (never trust client)
        - Enforce tenant boundary: building must belong to org
        - Convert Django ValidationError into DRF 400 ValidationError
    """
    # Step 1: Copy + sanitize incoming data
    payload = dict(data)
    payload.pop("organization", None)  # never accept tenant fields from client

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
    """Update a unit (org-safe)."""
    # Step 1: Copy + sanitize incoming data
    payload = dict(data)
    payload.pop("organization", None)  # never allow tenant mutation

    # Step 2: Apply updates
    for field, value in payload.items():
        setattr(instance, field, value)

    # Step 3: Persist (Unit.save() will run full_clean)
    try:
        instance.save()
    except ValidationError as exc:
        raise DRFValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))

    return instance