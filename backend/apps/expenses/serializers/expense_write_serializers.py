"""
Write serializers for the expense intelligence domain.

These serializers are intentionally strict and input-oriented.

They should:
- validate request shape
- accept explicit user input
- delegate business rules to the service layer

They should not:
- hide core expense domain logic
- become a second service layer
"""

from __future__ import annotations

from rest_framework import serializers

from apps.expenses.choices import (
    ExpenseSource,
    ExpenseStatus,
    ReimbursementStatus,
)
from apps.expenses.models import Expense
from apps.expenses.services import ExpenseService, ExpenseWritePayload


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Strict serializer for expense creation."""

    class Meta:
        model = Expense
        fields = [
            "organization",
            "scope",
            "building",
            "unit",
            "lease",
            "category",
            "vendor",
            "title",
            "description",
            "amount",
            "expense_date",
            "due_date",
            "paid_date",
            "status",
            "is_reimbursable",
            "reimbursement_status",
            "invoice_number",
            "external_reference",
            "notes",
            "source",
        ]

    def create(self, validated_data: dict) -> Expense:
        """Create a new expense through the service layer."""
        request = self.context.get("request")
        user = getattr(request, "user", None)

        payload = ExpenseWritePayload(
            organization=validated_data["organization"],
            scope=validated_data["scope"],
            building=validated_data.get("building"),
            unit=validated_data.get("unit"),
            lease=validated_data.get("lease"),
            category=validated_data.get("category"),
            vendor=validated_data.get("vendor"),
            title=validated_data["title"],
            description=validated_data.get("description", ""),
            amount=validated_data["amount"],
            expense_date=validated_data["expense_date"],
            due_date=validated_data.get("due_date"),
            paid_date=validated_data.get("paid_date"),
            status=validated_data.get("status", ExpenseStatus.DRAFT),
            is_reimbursable=validated_data.get("is_reimbursable", False),
            reimbursement_status=validated_data.get(
                "reimbursement_status",
                ReimbursementStatus.NOT_APPLICABLE,
            ),
            invoice_number=validated_data.get("invoice_number", ""),
            external_reference=validated_data.get("external_reference", ""),
            notes=validated_data.get("notes", ""),
            source=validated_data.get("source", ExpenseSource.MANUAL),
            created_by=user,
            updated_by=user,
        )
        return ExpenseService.create_expense(payload=payload)


class ExpenseUpdateSerializer(serializers.ModelSerializer):
    """Strict serializer for expense updates."""

    class Meta:
        model = Expense
        fields = [
            "scope",
            "building",
            "unit",
            "lease",
            "category",
            "vendor",
            "title",
            "description",
            "amount",
            "expense_date",
            "due_date",
            "paid_date",
            "status",
            "is_reimbursable",
            "reimbursement_status",
            "invoice_number",
            "external_reference",
            "notes",
            "source",
        ]

    def update(self, instance: Expense, validated_data: dict) -> Expense:
        """Update an existing expense through the service layer."""
        request = self.context.get("request")
        user = getattr(request, "user", None)

        return ExpenseService.update_expense(
            expense=instance,
            updates=validated_data,
            updated_by=user,
        )


class ExpenseArchiveSerializer(serializers.Serializer):
    """Minimal serializer for archive/unarchive responses."""

    is_archived = serializers.BooleanField(read_only=True)
    archived_at = serializers.DateTimeField(read_only=True)