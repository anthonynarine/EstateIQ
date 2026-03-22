# Filename: backend/apps/expenses/serializers/expense_write_serializers.py

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
        extra_kwargs = {
            "title": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "building": {"required": False, "allow_null": True},
            "unit": {"required": False, "allow_null": True},
            "lease": {"required": False, "allow_null": True},
            "category": {"required": False, "allow_null": True},
            "vendor": {"required": False, "allow_null": True},
            "due_date": {"required": False, "allow_null": True},
            "paid_date": {"required": False, "allow_null": True},
            "status": {"required": False},
            "is_reimbursable": {"required": False},
            "reimbursement_status": {"required": False},
            "invoice_number": {"required": False, "allow_blank": True},
            "external_reference": {"required": False, "allow_blank": True},
            "notes": {"required": False, "allow_blank": True},
            "source": {"required": False},
        }

    def validate(self, attrs: dict) -> dict:
        """Normalize text fields for the current frontend contract."""
        # Step 1: Support the current UI, which sends description but not title.
        title = (attrs.get("title") or "").strip()
        description = (attrs.get("description") or "").strip()

        if not title and description:
            attrs["title"] = description

        # Step 2: Fail clearly if neither title nor description contains usable text.
        normalized_title = (attrs.get("title") or "").strip()
        if not normalized_title:
            raise serializers.ValidationError(
                {"title": "A title or description is required."}
            )

        return attrs

    def create(self, validated_data: dict) -> Expense:
        """Create a new expense through the service layer."""
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # Step 1: Accept organization from serializer.save(organization=...)
        # supplied by the view layer.
        organization = validated_data.get("organization")
        if organization is None:
            organization = self.context.get("organization")

        if organization is None:
            raise serializers.ValidationError(
                {"organization": "Organization context is required."}
            )

        payload = ExpenseWritePayload(
            organization=organization,
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
        extra_kwargs = {
            "title": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "building": {"required": False, "allow_null": True},
            "unit": {"required": False, "allow_null": True},
            "lease": {"required": False, "allow_null": True},
            "category": {"required": False, "allow_null": True},
            "vendor": {"required": False, "allow_null": True},
            "due_date": {"required": False, "allow_null": True},
            "paid_date": {"required": False, "allow_null": True},
            "status": {"required": False},
            "is_reimbursable": {"required": False},
            "reimbursement_status": {"required": False},
            "invoice_number": {"required": False, "allow_blank": True},
            "external_reference": {"required": False, "allow_blank": True},
            "notes": {"required": False, "allow_blank": True},
            "source": {"required": False},
        }

    def validate(self, attrs: dict) -> dict:
        """Support partial updates from the current frontend contract."""
        # Step 1: If description is provided without title, mirror it into title.
        title = attrs.get("title")
        description = attrs.get("description")

        if (title is None or str(title).strip() == "") and description:
            attrs["title"] = description

        return attrs

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