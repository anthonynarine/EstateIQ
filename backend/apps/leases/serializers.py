# Filename: backend/apps/leases/serializers.py

from __future__ import annotations

from typing import Any, Dict, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
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
            return DRFValidationError(
                {"non_field_errors": [str(message) for message in messages]}
            )

        return DRFValidationError({"non_field_errors": ["Validation error."]})

    # Step 3: Fallback
    return DRFValidationError({"non_field_errors": [str(exc)]})



class TenantWriteSerializer(serializers.ModelSerializer):
    """Tenant write serializer.

    This serializer intentionally stays lean and only handles tenant
    identity/contact CRUD. Residency history remains derived from lease
    relationships and is exposed through dedicated read serializers.
    """

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



class TenantDirectoryLeaseBuildingSerializer(serializers.Serializer):
    """Compact building summary for tenant directory active lease data."""

    id = serializers.IntegerField(allow_null=True)
    label = serializers.CharField(allow_null=True)



class TenantDirectoryLeaseUnitSerializer(serializers.Serializer):
    """Compact unit summary for tenant directory active lease data."""

    id = serializers.IntegerField(allow_null=True)
    label = serializers.CharField(allow_null=True)


class TenantDirectoryActiveLeaseSerializer(serializers.Serializer):
    """Active lease summary that matches the current frontend list contract."""

    id = serializers.IntegerField()
    status = serializers.CharField()
    start_date = serializers.DateField()
    building = TenantDirectoryLeaseBuildingSerializer()
    unit = TenantDirectoryLeaseUnitSerializer()



class TenantResidenceSummarySerializer(serializers.Serializer):
    """Read-only tenant residence summary for detail views."""

    lease_id = serializers.IntegerField()
    building_id = serializers.IntegerField(allow_null=True)
    building_name = serializers.CharField(allow_null=True)
    unit_id = serializers.IntegerField(allow_null=True)
    unit_label = serializers.CharField(allow_null=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    rent_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        allow_null=True,
    )
    role = serializers.CharField()



class TenantLeaseHistoryItemSerializer(serializers.Serializer):
    """Read-only lease history item for tenant detail views."""

    lease_id = serializers.IntegerField()
    building_id = serializers.IntegerField(allow_null=True)
    building_name = serializers.CharField(allow_null=True)
    unit_id = serializers.IntegerField(allow_null=True)
    unit_label = serializers.CharField(allow_null=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    rent_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        allow_null=True,
    )
    role = serializers.CharField()



class TenantDirectorySerializer(serializers.ModelSerializer):
    """Tenant directory read serializer.

    This serializer preserves the frontend list contract by returning
    `active_lease` while also adding a lightweight derived
    `occupancy_status` field.
    """

    occupancy_status = serializers.SerializerMethodField()
    active_lease = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "occupancy_status",
            "active_lease",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def _get_prefetched_links(self, obj: Tenant) -> list[LeaseTenant]:
        """Return prefetched lease links when available.

        Falls back to a safe query path if the selector was not used.
        The selector path is still preferred for list performance.
        """
        # Step 1: Use prefetched links when available
        prefetched_links = getattr(obj, "prefetched_lease_links", None)
        if prefetched_links is not None:
            return list(prefetched_links)

        # Step 2: Fallback query path
        return list(
            obj.lease_links.select_related(
                "lease",
                "lease__unit",
                "lease__unit__building",
            ).order_by(
                "-lease__start_date",
                "-lease__id",
                "role",
                "id",
            )
        )

    def _is_active_lease(self, lease: Lease) -> bool:
        """Return True when the lease is active today using end-exclusive logic."""
        # Step 1: Resolve the evaluation date
        today = timezone.localdate()

        # Step 2: Lease must be marked active and already started
        if lease.status != Lease.Status.ACTIVE:
            return False

        if lease.start_date > today:
            return False

        # Step 3: End date is exclusive
        if lease.end_date is not None and lease.end_date <= today:
            return False

        return True

    def _get_unit_label(self, unit: Optional[Unit]) -> Optional[str]:
        """Return the best available unit label for directory/detail payloads."""
        # Step 1: Guard null unit
        if unit is None:
            return None

        # Step 2: Try common label fields used across unit models
        return (
            getattr(unit, "unit_label", None)
            or getattr(unit, "unit_number", None)
            or getattr(unit, "name", None)
            or str(unit)
        )

    def _get_active_link(self, obj: Tenant) -> Optional[LeaseTenant]:
        """Return the tenant's current active lease link, if any."""
        # Step 1: Iterate in recency order
        for lease_link in self._get_prefetched_links(obj):
            if self._is_active_lease(lease_link.lease):
                return lease_link

        return None

    def _build_active_lease_summary(self, lease_link: LeaseTenant) -> dict[str, Any]:
        """Build the frontend-compatible active_lease payload."""
        # Step 1: Resolve related objects
        lease = lease_link.lease
        unit = getattr(lease, "unit", None)
        building = getattr(unit, "building", None)

        # Step 2: Return the stable directory contract
        return {
            "id": lease.id,
            "status": lease.status,
            "start_date": lease.start_date,
            "building": {
                "id": getattr(building, "id", None),
                "label": getattr(building, "name", None),
            },
            "unit": {
                "id": getattr(unit, "id", None),
                "label": self._get_unit_label(unit),
            },
        }

    def _build_residence_summary(self, lease_link: LeaseTenant) -> dict[str, Any]:
        """Build the richer residence summary used by detail views."""
        # Step 1: Resolve related objects
        lease = lease_link.lease
        unit = getattr(lease, "unit", None)
        building = getattr(unit, "building", None)

        # Step 2: Return the stable detail contract
        return {
            "lease_id": lease.id,
            "building_id": getattr(building, "id", None),
            "building_name": getattr(building, "name", None),
            "unit_id": getattr(unit, "id", None),
            "unit_label": self._get_unit_label(unit),
            "start_date": lease.start_date,
            "end_date": lease.end_date,
            "status": lease.status,
            "rent_amount": lease.rent_amount,
            "role": lease_link.role,
        }

    def get_occupancy_status(self, obj: Tenant) -> str:
        """Return active/former status derived from the active lease link."""
        # Step 1: Derive the current occupancy state
        return "active" if self._get_active_link(obj) else "former"

    def get_active_lease(self, obj: Tenant) -> Optional[dict[str, Any]]:
        """Return the frontend-compatible active_lease summary."""
        # Step 1: Resolve the active lease link
        active_link = self._get_active_link(obj)
        if not active_link:
            return None

        # Step 2: Return the active lease summary
        return self._build_active_lease_summary(active_link)



class TenantDetailSerializer(TenantDirectorySerializer):
    """Tenant detail read serializer.

    Extends the tenant directory serializer with richer residence/history
    data for a future tenant detail page.
    """

    current_residence = serializers.SerializerMethodField()
    lease_history = serializers.SerializerMethodField()

    class Meta(TenantDirectorySerializer.Meta):
        fields = TenantDirectorySerializer.Meta.fields + [
            "current_residence",
            "lease_history",
        ]
        read_only_fields = fields

    def get_current_residence(self, obj: Tenant) -> Optional[dict[str, Any]]:
        """Return the richer current residence summary for detail views."""
        # Step 1: Resolve active link
        active_link = self._get_active_link(obj)
        if not active_link:
            return None

        # Step 2: Return the detail summary
        return self._build_residence_summary(active_link)

    def get_lease_history(self, obj: Tenant) -> list[dict[str, Any]]:
        """Return full lease history in reverse chronological order."""
        # Step 1: Build history from authoritative lease links
        return [
            self._build_residence_summary(lease_link)
            for lease_link in self._get_prefetched_links(obj)
        ]


class TenantSerializer(TenantWriteSerializer):
    """Backward-compatible alias for existing imports.

    New code should prefer TenantWriteSerializer explicitly.
    """


class LeasePartySerializer(serializers.Serializer):
    """Write-only representation for attaching tenants to a lease."""

    tenant_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=LeaseTenant.Role.choices,
        default=LeaseTenant.Role.PRIMARY,
    )


class LeasePartyDetailSerializer(serializers.ModelSerializer):
    """Read-only detail for lease parties."""

    tenant = TenantWriteSerializer(read_only=True)

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
        return LeasePartyDetailSerializer(
            qs,
            many=True,
            context=self.context,
        ).data

    def validate_unit(self, unit: Unit) -> Unit:
        """Ensure the unit belongs to request.org."""
        org = self.context["request"].org
        if unit.organization_id != org.id:
            raise serializers.ValidationError(
                "Unit must belong to the active organization."
            )
        return unit

    def _parse_parties(
        self,
        parties_data: Optional[list[dict]],
    ) -> Optional[list[LeasePartyInput]]:
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
        security_deposit_amount = validated_data.pop(
            "security_deposit_amount",
            _MISSING,
        )

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