# Filename: backend/apps/buildings/services.py
from __future__ import annotations

from typing import Any, Dict

from django.db import transaction

from apps.buildings.models import Building, Unit
from .models import Organization


@transaction.atomic
def create_building(*, org: Organization, data: Dict[str, Any]) -> Building:
    """Create a building in the tenant org.

    Args:
        org: Tenant boundary (request.org).
        data: Serializer validated_data (DRF-agnostic).

    Returns:
        Created Building.
    """
    # Step 1: server-enforce tenant boundary
    payload = dict(data)
    payload.pop("organization", None)

    # Step 2: create
    return Building.objects.create(organization=org, **payload)


@transaction.atomic
def update_building(*, org: Organization, instance: Building, data: Dict[str, Any]) -> Building:
    """Update a building (org-safe).

    Args:
        org: Tenant boundary.
        instance: Building instance already filtered by org queryset.
        data: Serializer validated_data.

    Returns:
        Updated Building.
    """
    payload = dict(data)
    payload.pop("organization", None)

    for field, value in payload.items():
        setattr(instance, field, value)

    instance.save()
    return instance


@transaction.atomic
def create_unit(*, org: Organization, data: Dict[str, Any]) -> Unit:
    """Create a unit (org-safe).

    Notes:
        - building validation (cross-tenant) is handled by UnitSerializer.validate_building
    """
    payload = dict(data)
    return Unit.objects.create(**payload)


@transaction.atomic
def update_unit(*, org: Organization, instance: Unit, data: Dict[str, Any]) -> Unit:
    """Update a unit (org-safe)."""
    payload = dict(data)

    for field, value in payload.items():
        setattr(instance, field, value)

    instance.save()
    return instance