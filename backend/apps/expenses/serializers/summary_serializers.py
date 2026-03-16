"""
Reusable summary serializers for the expenses domain.

These serializers are intentionally small and display-oriented. They are used by
richer read serializers so the API can support a frontend with:
- table views
- card views
- side panels
- detail pages
- filter chips and badges

These serializers should remain lightweight and deterministic.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.expenses.models import ExpenseCategory, Vendor


class ExpenseCategorySummarySerializer(serializers.ModelSerializer):
    """Compact category summary used in expense read responses."""

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "name",
            "slug",
            "kind",
            "kind_label",
            "is_active",
        ]
        read_only_fields = fields


class VendorSummarySerializer(serializers.ModelSerializer):
    """Compact vendor summary used in expense read responses."""

    vendor_type_label = serializers.CharField(
        source="get_vendor_type_display",
        read_only=True,
    )

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "vendor_type",
            "vendor_type_label",
            "is_active",
        ]
        read_only_fields = fields


class BuildingSummarySerializer(serializers.Serializer):
    """Lightweight building summary for rich expense responses."""

    id = serializers.IntegerField()
    name = serializers.CharField()


class UnitSummarySerializer(serializers.Serializer):
    """Lightweight unit summary for rich expense responses."""

    id = serializers.IntegerField()
    name = serializers.CharField()


class LeaseSummarySerializer(serializers.Serializer):
    """Lightweight lease summary for rich expense responses."""

    id = serializers.IntegerField()
    status = serializers.CharField()
    start_date = serializers.DateField(allow_null=True)
    end_date = serializers.DateField(allow_null=True)


class ExpenseReimbursementSummarySerializer(serializers.Serializer):
    """Display-friendly reimbursement summary for expense read responses."""

    is_reimbursable = serializers.BooleanField()
    status = serializers.CharField()
    status_label = serializers.CharField()