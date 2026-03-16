"""
Category serializers for the expenses domain.

These serializers support CRUD-style category endpoints while still exposing
display-friendly labels for the frontend.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.expenses.models import ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Full serializer for category CRUD endpoints."""

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "organization",
            "name",
            "slug",
            "parent",
            "kind",
            "kind_label",
            "description",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "kind_label"]