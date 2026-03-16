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
        read_only_fields = ["id", "created_at", "updated_at", "vendor_type_label"]