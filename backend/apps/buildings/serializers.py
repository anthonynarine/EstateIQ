# Filename: apps/buildings/serializers.py
from __future__ import annotations

from rest_framework import serializers

from apps.buildings.models import Building, Unit


class BuildingSerializer(serializers.ModelSerializer):
    """Serializer for Building objects.

    Multi-tenant rules:
        - organization is derived from request.org (never client-supplied).
    """

    class Meta:
        model = Building
        fields = [
            "id",
            "name",
            "building_type",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UnitSerializer(serializers.ModelSerializer):
    """Serializer for Unit objects.

    Multi-tenant rules:
        - organization is derived from request.org (never client-supplied).
        - building must belong to request.org.
    """

    class Meta:
        model = Unit
        fields = [
            "id",
            "building",
            "label",
            "bedrooms",
            "bathrooms",
            "sqft",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_building(self, building: Building) -> Building:
        # Step 1: ensure request.org exists
        request = self.context.get("request")
        org = getattr(request, "org", None) if request else None
        if org is None:
            raise serializers.ValidationError("Organization context is missing.")

        # Step 2: prevent cross-tenant linking
        if building.organization_id != org.id:
            raise serializers.ValidationError("Building belongs to a different organization.")
        return building
