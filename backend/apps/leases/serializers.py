# Filename: backend/apps/leases/serializers.py
from __future__ import annotations

from rest_framework import serializers

from apps.buildings.models import Unit
from apps.leases.models import Lease, LeaseTenant, Tenant
from apps.leases.services import (
    LeasePartyInput,
    create_lease,
    create_tenant,
    update_lease,
    update_tenant,
)


class TenantSerializer(serializers.ModelSerializer):
    """Tenant serializer (organization is always derived from request.org)."""

    class Meta:
        model = Tenant
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        # Step 1: org derived from request
        org = self.context["request"].org
        return create_tenant(org=org, **validated_data)

    def update(self, instance, validated_data):
        return update_tenant(tenant=instance, **validated_data)


class LeasePartySerializer(serializers.Serializer):
    """Write-only representation for attaching tenants to a lease."""
    tenant_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=LeaseTenant.Role.choices,
        default=LeaseTenant.Role.PRIMARY,
    )


class LeasePartyDetailSerializer(serializers.ModelSerializer):
    """Read-only detail for lease parties."""

    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = LeaseTenant
        fields = ["tenant", "role"]


class LeaseSerializer(serializers.ModelSerializer):
    """Lease serializer (organization is derived from request.org).

    Write:
      parties: [{ "tenant_id": 1, "role": "primary" }, ...]

    Read:
      parties_detail: [{ "tenant": {...}, "role": "primary" }, ...]
    """

    parties = LeasePartySerializer(many=True, required=False, write_only=True)
    parties_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Lease
        fields = [
            "id",
            "unit",
            "start_date",
            "end_date",
            "rent_amount",
            "security_deposit_amount",
            "rent_due_day",
            "status",
            "parties",         # write-only
            "parties_detail",  # read-only
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "parties_detail"]

    def get_parties_detail(self, obj: Lease):
        # Step 1: return joined tenants + roles (ordered: primary first, then others)
        qs = obj.parties.select_related("tenant").all().order_by("role", "id")
        return LeasePartyDetailSerializer(qs, many=True, context=self.context).data

    def validate_unit(self, unit: Unit) -> Unit:
        # Step 1: ensure unit belongs to request.org
        org = self.context["request"].org
        if unit.organization_id != org.id:
            raise serializers.ValidationError("Unit must belong to the active organization.")
        return unit

    def create(self, validated_data):
        org = self.context["request"].org
        parties_data = validated_data.pop("parties", None)

        parties = None
        if parties_data is not None:
            parties = [LeasePartyInput(**p) for p in parties_data]

        return create_lease(org=org, parties=parties, **validated_data)

    def update(self, instance, validated_data):
        org = self.context["request"].org
        parties_data = validated_data.pop("parties", None)

        parties = None
        if parties_data is not None:
            parties = [LeasePartyInput(**p) for p in parties_data]

        return update_lease(org=org, lease=instance, parties=parties, **validated_data)
