# Filename: apps/buildings/serializers.py
from __future__ import annotations

from rest_framework import serializers

from apps.buildings.models import Building, Unit


class BuildingSerializer(serializers.ModelSerializer):
    """Serializer for Building objects.

    Multi-tenant rules:
        - organization is derived from request.org (never client-supplied).

    API contract notes:
        - address_line2 is optional and may be omitted or set to null.
        - country is optional.

    Aggregates (read-only):
        - units_count
        - occupied_units_count
        - vacant_units_count
    """

    # Step 1: Explicitly allow null / optional for address_line2
    address_line2 = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    # Step 2: Optional fields (adjust based on your model constraints)
    country = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    # Step 3: Aggregate counts (annotated in queryset; read-only)
    units_count = serializers.IntegerField(read_only=True)
    occupied_units_count = serializers.IntegerField(read_only=True)
    vacant_units_count = serializers.IntegerField(read_only=True)

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
            "units_count",
            "occupied_units_count",
            "vacant_units_count",
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
