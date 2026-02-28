# Filename: backend/apps/leases/serializers.py
from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.buildings.models import Unit
from apps.leases.models import Lease, LeaseTenant, Tenant
from apps.leases.services import (
    LeasePartyInput,
    _MISSING,
    create_lease,
    create_tenant,
    update_lease,
    update_tenant,
)


class TenantSerializer(serializers.ModelSerializer):
    """Tenant serializer (organization is derived from request.org)."""

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
        # Step 1: Org derived from request middleware
        org = self.context["request"].org
        return create_tenant(org=org, **validated_data)

    def update(self, instance, validated_data):
        # Step 1: Tenant update (PATCH/PUT safe)
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
    """Lease serializer (organization derived from request.org).

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
            "parties",
            "parties_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "parties_detail"]

    def get_parties_detail(self, obj: Lease):
        # Step 1: joined tenants + roles
        qs = obj.parties.select_related("tenant").all().order_by("role", "id")
        return LeasePartyDetailSerializer(qs, many=True, context=self.context).data

    def validate_unit(self, unit: Unit) -> Unit:
        # Step 1: ensure unit belongs to org boundary
        org = self.context["request"].org
        if unit.organization_id != org.id:
            raise serializers.ValidationError({"unit": ["Unit must belong to the active organization."]})
        return unit

    # Step 2: Normalize service-layer Django ValidationError -> DRF ValidationError
    def _raise_service_validation(self, exc: DjangoValidationError) -> None:
        """
        Convert django.core.exceptions.ValidationError raised by the service layer
        into rest_framework.serializers.ValidationError so DRF returns HTTP 400.

        The service may raise:
          - ValidationError({"field": "message"})
          - ValidationError({"field": ["message"]})
          - ValidationError("message")

        We normalize to DRF's expected error shape:
          - {"field": ["message"]}
          - {"non_field_errors": ["message"]}
        """
        if hasattr(exc, "message_dict"):
            normalized: dict[str, list[str]] = {}
            for field, messages in exc.message_dict.items():
                if isinstance(messages, (list, tuple)):
                    normalized[field] = [str(m) for m in messages]
                else:
                    normalized[field] = [str(messages)]
            raise serializers.ValidationError(normalized)

        # Fallback: plain message list
        messages = getattr(exc, "messages", None)
        if messages:
            raise serializers.ValidationError({"non_field_errors": [str(m) for m in messages]})

        raise serializers.ValidationError({"non_field_errors": ["Validation error."]})

    def create(self, validated_data):
        # Step 1: org derived from request
        org = self.context["request"].org
        parties_data = validated_data.pop("parties", None)

        parties = None
        if parties_data is not None:
            parties = [LeasePartyInput(**p) for p in parties_data]

        # Step 2: call service; return proper 400 on invariant violations
        try:
            return create_lease(org=org, parties=parties, **validated_data)
        except DjangoValidationError as exc:
            self._raise_service_validation(exc)

    def update(self, instance, validated_data):
        """PATCH-safe update with explicit null support."""
        # Step 1: org derived from request
        org = self.context["request"].org

        # Step 2: parties (authoritative if provided)
        parties_data = validated_data.pop("parties", None)
        parties = None
        if parties_data is not None:
            parties = [LeasePartyInput(**p) for p in parties_data]

        # Step 3: unit defaults to instance.unit if omitted
        unit = validated_data.pop("unit", None) or instance.unit

        # Step 4: sentinel fields (distinguish omitted vs explicit null)
        end_date = validated_data.pop("end_date", _MISSING)
        security_deposit_amount = validated_data.pop("security_deposit_amount", _MISSING)

        # Step 5: delegate to service; return proper 400 on invariant violations
        try:
            return update_lease(
                org=org,
                lease=instance,
                unit=unit,
                end_date=end_date,
                security_deposit_amount=security_deposit_amount,
                parties=parties,
                **validated_data,
            )
        except DjangoValidationError as exc:
            self._raise_service_validation(exc)