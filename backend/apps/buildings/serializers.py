# Filename: apps/buildings/serializers.py


from __future__ import annotations

from rest_framework import serializers

from apps.buildings.models import Building, Unit


class BuildingSerializer(serializers.ModelSerializer):
    """Serializer for building records.

    Multi-tenant rules:
        - organization is derived from request.org and never client-supplied.

    Aggregates:
        - units_count
        - occupied_units_count
        - vacant_units_count
    """

    # Step 1: Optional address fields
    address_line2 = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    country = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    # Step 2: Annotated aggregate fields
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
    """Serializer for unit records plus occupancy read-model fields.

    Multi-tenant rules:
        - organization is derived from request.org (never client-supplied)
        - building must belong to request.org
        - building cannot be reassigned after creation

    Computed contract:
        - The unit workspace consumes selector-driven occupancy fields
        - Tenant summary data is exposed as read-only API fields
        - The backend remains the source of truth for active-lease resolution
    """

    # Step 1: Selector-driven occupancy fields
    is_occupied = serializers.BooleanField(read_only=True)
    active_lease_id = serializers.IntegerField(read_only=True, allow_null=True)
    active_lease_end_date = serializers.DateField(read_only=True, allow_null=True)

    # Step 2: Selector-driven active tenant summary fields
    active_tenant_id = serializers.IntegerField(read_only=True, allow_null=True)
    active_tenant_name = serializers.CharField(read_only=True, allow_null=True)
    active_tenant_email = serializers.EmailField(read_only=True, allow_null=True)
    active_tenant_phone = serializers.CharField(read_only=True, allow_null=True)

    # Step 3: Read-model warning flag for malformed occupancy linkage
    occupancy_has_data_issue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Unit
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
            "active_tenant_email",
            "active_tenant_phone",
            "occupancy_has_data_issue",
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
            "active_tenant_email",
            "active_tenant_phone",
            "occupancy_has_data_issue",
        ]

    def validate_building(self, building: Building) -> Building:
        """Validate building membership and immutability.

        Args:
            building: Candidate building instance.

        Returns:
            Building: The same building if validation succeeds.

        Raises:
            serializers.ValidationError: If org context is missing, if the
                building belongs to another org, or if an update tries to move
                the unit to a different building.
        """
        # Step 1: Resolve org from request context
        request = self.context.get("request")
        org = getattr(request, "org", None) if request else None
        if org is None:
            raise serializers.ValidationError("Organization context is missing.")

        # Step 2: Prevent cross-tenant assignment
        if building.organization_id != org.id:
            raise serializers.ValidationError(
                "Building belongs to a different organization."
            )

        # Step 3: Prevent silent building transfers on update
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

    The detail view keeps the same occupancy contract as the list view but adds
    a nested building summary for deterministic header/navigation rendering.
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
            "active_tenant_email",
            "active_tenant_phone",
            "occupancy_has_data_issue",
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
            "active_tenant_email",
            "active_tenant_phone",
            "occupancy_has_data_issue",
        ]