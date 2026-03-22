
"""
Vendor serializers for the expenses domain.

These serializers support CRUD-style vendor endpoints while preserving a clean,
frontend-friendly API shape.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.expenses.models import Vendor


class VendorSerializer(serializers.ModelSerializer):
    """Full serializer for vendor CRUD endpoints."""

    vendor_type_label = serializers.CharField(
        source="get_vendor_type_display",
        read_only=True,
    )

    class Meta:
        model = Vendor
        fields = [
            "id",
            "organization",
            "name",
            "vendor_type",
            "vendor_type_label",
            "contact_name",
            "email",
            "phone",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_at",
            "updated_at",
            "vendor_type_label",
        ]

    def validate_name(self, value: str) -> str:
        """Validate and normalize vendor name.

        Args:
            value: Raw vendor name from the request.

        Returns:
            str: Trimmed vendor name preserving brand casing.

        Raises:
            serializers.ValidationError: If the name is invalid or duplicated.
        """
        # Step 1: Normalize whitespace but preserve intended casing.
        normalized_value = " ".join(value.strip().split())

        if not normalized_value:
            raise serializers.ValidationError("Vendor name cannot be blank.")

        organization = self._get_target_organization()

        queryset = Vendor.objects.filter(
            organization=organization,
            name__iexact=normalized_value,
        )

        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A vendor with this name already exists in this organization."
            )

        return normalized_value

    def validate_contact_name(self, value: str) -> str:
        """Trim the contact name without changing meaning."""
        return " ".join(value.strip().split())

    def validate_email(self, value: str) -> str:
        """Normalize vendor email for consistency."""
        return value.strip().lower()

    def validate_phone(self, value: str) -> str:
        """Trim vendor phone without format enforcement yet."""
        return value.strip()

    def validate_notes(self, value: str) -> str:
        """Trim vendor notes without changing casing."""
        return value.strip()

    def _get_request_organization(self):
        """Return the request organization from serializer context."""
        request = self.context.get("request")

        if request is None:
            return None

        return getattr(request, "organization", None) or getattr(
            request,
            "org",
            None,
        )

    def _get_target_organization(self):
        """Return the organization for this serializer operation."""
        if self.instance is not None:
            return self.instance.organization

        organization = self._get_request_organization()

        if organization is None:
            raise serializers.ValidationError(
                "No organization was resolved for this request."
            )

        return organization