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

    # Step 2: Optional fields
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
        - building cannot be changed after creation (prevents silent unit transfers).

    Computed contract:
        - Occupancy and active lease/tenant summary fields are selector-driven.
        - These fields are flat and read-only for frontend usability.
    """

    # Step 1: Computed/annotated fields (read-only; must be annotated in queryset)
    is_occupied = serializers.BooleanField(read_only=True)
    active_lease_id = serializers.IntegerField(read_only=True, allow_null=True)
    active_lease_end_date = serializers.DateField(read_only=True, allow_null=True)
    active_tenant_id = serializers.IntegerField(read_only=True, allow_null=True)
    active_tenant_name = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Unit
        fields = [
            "id",
            "building",
            "label",
            "bedrooms",
            "bathrooms",
            "sqft",
            # Step 2: Occupancy + active lease summary fields
            "is_occupied",
            "active_lease_id",
            "active_lease_end_date",
            "active_tenant_id",
            "active_tenant_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "is_occupied",
            "active_lease_id",
            "active_lease_end_date",
            "active_tenant_id",
            "active_tenant_name",
        ]

    def validate_building(self, building: Building) -> Building:
        """Validate building org membership and immutability.

        Args:
            building: Candidate Building instance.

        Returns:
            The same building if valid.

        Raises:
            serializers.ValidationError: If org context missing, cross-tenant,
                or attempt to change building on update.
        """
        # Step 1: Ensure request.org exists
        request = self.context.get("request")
        org = getattr(request, "org", None) if request else None
        if org is None:
            raise serializers.ValidationError("Organization context is missing.")

        # Step 2: Prevent cross-tenant linking
        if building.organization_id != org.id:
            raise serializers.ValidationError(
                "Building belongs to a different organization."
            )

        # Step 3: Prevent changing building on update
        if self.instance is not None and building.id != self.instance.building_id:
            raise serializers.ValidationError(
                "Building cannot be changed after unit creation."
            )

        return building


class BuildingSummarySerializer(serializers.ModelSerializer):
    """Small nested building representation for unit detail responses."""

    class Meta:
        model = Building
        fields = ["id", "name"]


class UnitDetailSerializer(UnitSerializer):
    """Detailed unit serializer for retrieve views.

    This keeps the base UnitSerializer lean for list/create/update while
    allowing the unit detail page to receive the parent building summary
    needed for deterministic navigation and header rendering.
    """

    building = BuildingSummarySerializer(read_only=True)

    class Meta(UnitSerializer.Meta):
        fields = [
            "id",
            "building",
            "label",
            "bedrooms",
            "bathrooms",
            "sqft",
            "is_occupied",
            "active_lease_id",
            "active_lease_end_date",
            "active_tenant_id",
            "active_tenant_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "building",
            "created_at",
            "updated_at",
            "is_occupied",
            "active_lease_id",
            "active_lease_end_date",
            "active_tenant_id",
            "active_tenant_name",
        ]