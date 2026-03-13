# Filename: backend/apps/leases/serializers.py

from __future__ import annotations

from typing import Any, Dict, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.buildings.models import Unit
from apps.leases.models import Lease, LeaseTenant, Tenant
from apps.leases.services import (
    LeasePartyInput,
    _MISSING,
    create_lease,
    create_tenant,
    end_lease,
    update_lease,
    update_tenant,
)


def _normalize_validation_error(exc: Exception) -> DRFValidationError:
    """Normalize various validation exceptions into a DRF ValidationError."""
    # Step 1: Already DRF
    if isinstance(exc, DRFValidationError):
        return exc

    # Step 2: Django ValidationError
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            normalized: Dict[str, Any] = {}
            for field, messages in exc.message_dict.items():
                if isinstance(messages, dict):
                    normalized[field] = messages
                    continue

                if isinstance(messages, (list, tuple)):
                    normalized[field] = [str(message) for message in messages]
                else:
                    normalized[field] = [str(messages)]
            return DRFValidationError(normalized)

        messages = getattr(exc, "messages", None)
        if messages:
            return DRFValidationError({"non_field_errors": [str(message) for message in messages]})

        return DRFValidationError({"non_field_errors": ["Validation error."]})

    # Step 3: Fallback
    return DRFValidationError({"non_field_errors": [str(exc)]})


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
        org = self.context["request"].org
        try:
            return create_tenant(org=org, **validated_data)
        except (DjangoValidationError, DRFValidationError, ValueError) as exc:
            raise _normalize_validation_error(exc)

    def update(self, instance, validated_data):
        try:
            return update_tenant(tenant=instance, **validated_data)
        except (DjangoValidationError, DRFValidationError, ValueError) as exc:
            raise _normalize_validation_error(exc)


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
    """Lease serializer (organization derived from request.org)."""

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
        qs = obj.parties.select_related("tenant").all().order_by("role", "id")
        return LeasePartyDetailSerializer(qs, many=True, context=self.context).data

    def validate_unit(self, unit: Unit) -> Unit:
        """Ensure the unit belongs to request.org."""
        org = self.context["request"].org
        if unit.organization_id != org.id:
            raise serializers.ValidationError("Unit must belong to the active organization.")
        return unit

    def _parse_parties(self, parties_data: Optional[list[dict]]) -> Optional[list[LeasePartyInput]]:
        """Convert parties payload into service-layer inputs."""
        if parties_data is None:
            return None
        return [LeasePartyInput(**party) for party in parties_data]

    def create(self, validated_data):
        org = self.context["request"].org
        parties_data = validated_data.pop("parties", None)
        parties = self._parse_parties(parties_data)

        try:
            return create_lease(org=org, parties=parties, **validated_data)
        except (DjangoValidationError, DRFValidationError, ValueError) as exc:
            raise _normalize_validation_error(exc)

    def update(self, instance, validated_data):
        org = self.context["request"].org
        parties_data = validated_data.pop("parties", None)
        parties = self._parse_parties(parties_data)

        unit = validated_data.pop("unit", None)

        end_date = validated_data.pop("end_date", _MISSING)
        security_deposit_amount = validated_data.pop("security_deposit_amount", _MISSING)

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
        except (DjangoValidationError, DRFValidationError, ValueError) as exc:
            raise _normalize_validation_error(exc)


class LeaseEndSerializer(serializers.Serializer):
    """Serializer for ending a lease (move-out date, end-exclusive)."""

    end_date = serializers.DateField(
        help_text="Move-out date (tenant does not occupy on this date)."
    )

    def save(self, **kwargs):
        org = self.context["request"].org
        lease: Lease = self.context["lease"]

        try:
            return end_lease(
                org=org,
                lease=lease,
                end_date=self.validated_data["end_date"],
            )
        except (DjangoValidationError, DRFValidationError, ValueError) as exc:
            raise _normalize_validation_error(exc)