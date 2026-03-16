
"""
Write-side service workflows for expense creation and updates.
"""

from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.expenses.models import Expense
from apps.expenses.services.expense_payloads import ExpenseWritePayload
from apps.expenses.services.expense_validation_service import (
    ExpenseValidationService,
)


class ExpenseWriteService:
    """Service for create and update expense workflows."""

    @classmethod
    @transaction.atomic
    def create_expense(cls, *, payload: ExpenseWritePayload) -> Expense:
        """Create a validated expense record.

        Args:
            payload: Normalized write payload for the new expense.

        Returns:
            Expense: The newly created expense record.
        """
        normalized_data = cls._normalize_payload(payload=payload)
        ExpenseValidationService.validate_expense_data(data=normalized_data)

        expense = Expense.objects.create(**normalized_data)
        return expense

    @classmethod
    @transaction.atomic
    def update_expense(
        cls,
        *,
        expense: Expense,
        updates: dict[str, Any],
        updated_by: Any | None = None,
    ) -> Expense:
        """Update an existing expense using validated service rules.

        Args:
            expense: Existing expense instance to mutate.
            updates: Partial update data.
            updated_by: User performing the update.

        Returns:
            Expense: The updated expense instance.
        """
        data = cls._build_update_data(
            expense=expense,
            updates=updates,
            updated_by=updated_by,
        )

        ExpenseValidationService.validate_expense_data(data=data)

        for field_name, value in data.items():
            if hasattr(expense, field_name):
                setattr(expense, field_name, value)

        expense.full_clean()
        expense.save()
        return expense

    @classmethod
    def _normalize_payload(cls, *, payload: ExpenseWritePayload) -> dict[str, Any]:
        """Convert dataclass payload into normalized model-ready data.

        Args:
            payload: Incoming structured payload.

        Returns:
            dict[str, Any]: Model-ready expense data.
        """
        return {
            "organization": payload.organization,
            "scope": payload.scope,
            "building": payload.building,
            "unit": payload.unit,
            "lease": payload.lease,
            "category": payload.category,
            "vendor": payload.vendor,
            "title": payload.title,
            "description": payload.description,
            "amount": payload.amount,
            "expense_date": payload.expense_date,
            "due_date": payload.due_date,
            "paid_date": payload.paid_date,
            "status": payload.status,
            "is_reimbursable": payload.is_reimbursable,
            "reimbursement_status": payload.reimbursement_status,
            "invoice_number": payload.invoice_number,
            "external_reference": payload.external_reference,
            "notes": payload.notes,
            "source": payload.source,
            "created_by": payload.created_by,
            "updated_by": payload.updated_by,
        }

    @classmethod
    def _build_update_data(
        cls,
        *,
        expense: Expense,
        updates: dict[str, Any],
        updated_by: Any | None = None,
    ) -> dict[str, Any]:
        """Build normalized update data from an existing expense and patch set.

        Args:
            expense: Existing expense instance.
            updates: Partial update values.
            updated_by: User performing the update.

        Returns:
            dict[str, Any]: Complete normalized expense data for validation.
        """
        return {
            "organization": expense.organization,
            "scope": updates.get("scope", expense.scope),
            "building": updates.get("building", expense.building),
            "unit": updates.get("unit", expense.unit),
            "lease": updates.get("lease", expense.lease),
            "category": updates.get("category", expense.category),
            "vendor": updates.get("vendor", expense.vendor),
            "title": updates.get("title", expense.title),
            "description": updates.get("description", expense.description),
            "amount": updates.get("amount", expense.amount),
            "expense_date": updates.get("expense_date", expense.expense_date),
            "due_date": updates.get("due_date", expense.due_date),
            "paid_date": updates.get("paid_date", expense.paid_date),
            "status": updates.get("status", expense.status),
            "is_reimbursable": updates.get(
                "is_reimbursable",
                expense.is_reimbursable,
            ),
            "reimbursement_status": updates.get(
                "reimbursement_status",
                expense.reimbursement_status,
            ),
            "invoice_number": updates.get(
                "invoice_number",
                expense.invoice_number,
            ),
            "external_reference": updates.get(
                "external_reference",
                expense.external_reference,
            ),
            "notes": updates.get("notes", expense.notes),
            "source": updates.get("source", expense.source),
            "created_by": expense.created_by,
            "updated_by": updated_by or expense.updated_by,
        }