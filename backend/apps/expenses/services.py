# Filename: backend/apps/expenses/services.py
"""
Service-layer workflows for the expense intelligence domain.

This module owns write-side business logic for expenses.

Why this file exists:
- views should stay thin
- serializers should not hide core domain rules
- cross-model validation should be explicit and testable
- expense write behavior should be deterministic and auditable

This module intentionally centralizes:
- create workflows
- update workflows
- archive workflows
- structural and relationship validation

Important:
This service layer validates business rules that are too dynamic or cross-model
aware to belong safely in database constraints alone.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.expenses.choices import ExpenseScope, ExpenseStatus, ReimbursementStatus
from apps.expenses.models import Expense


@dataclass(frozen=True)
class ExpenseWritePayload:
    """Normalized payload for create/update expense workflows.

    This dataclass gives the service layer a stable internal structure so that
    serializer-specific details do not leak into the business logic.
    """

    organization: Any
    scope: str
    title: str
    amount: Any
    expense_date: Any
    building: Any | None = None
    unit: Any | None = None
    lease: Any | None = None
    category: Any | None = None
    vendor: Any | None = None
    description: str = ""
    due_date: Any | None = None
    paid_date: Any | None = None
    status: str = ExpenseStatus.DRAFT
    is_reimbursable: bool = False
    reimbursement_status: str = ReimbursementStatus.NOT_APPLICABLE
    invoice_number: str = ""
    external_reference: str = ""
    notes: str = ""
    source: str = ""
    created_by: Any | None = None
    updated_by: Any | None = None


class ExpenseService:
    """Application service for expense write operations."""

    @classmethod
    @transaction.atomic
    def create_expense(cls, *, payload: ExpenseWritePayload) -> Expense:
        """Create a validated expense record.

        Args:
            payload: Normalized write payload for the new expense.

        Returns:
            Expense: The newly created expense record.

        Raises:
            ValidationError: If the payload violates expense domain rules.
        """
        normalized_data = cls._normalize_payload(payload=payload)
        cls._validate_expense_data(data=normalized_data)

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

        Raises:
            ValidationError: If the update produces invalid state.
        """
        data = {
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
            "invoice_number": updates.get("invoice_number", expense.invoice_number),
            "external_reference": updates.get(
                "external_reference",
                expense.external_reference,
            ),
            "notes": updates.get("notes", expense.notes),
            "source": updates.get("source", expense.source),
            "created_by": expense.created_by,
            "updated_by": updated_by or expense.updated_by,
        }

        cls._validate_expense_data(data=data)

        for field_name, value in data.items():
            if hasattr(expense, field_name):
                setattr(expense, field_name, value)

        expense.full_clean()
        expense.save()
        return expense

    @classmethod
    @transaction.atomic
    def archive_expense(cls, *, expense: Expense, updated_by: Any | None = None) -> Expense:
        """Soft-archive an expense.

        Args:
            expense: Expense to archive.
            updated_by: User performing the archive action.

        Returns:
            Expense: Archived expense instance.
        """
        if not expense.is_archived:
            expense.is_archived = True
            expense.archived_at = timezone.now()
            expense.updated_by = updated_by or expense.updated_by
            expense.save(update_fields=["is_archived", "archived_at", "updated_by", "updated_at"])

        return expense

    @classmethod
    @transaction.atomic
    def unarchive_expense(
        cls,
        *,
        expense: Expense,
        updated_by: Any | None = None,
    ) -> Expense:
        """Restore a previously archived expense.

        Args:
            expense: Expense to restore.
            updated_by: User performing the restore action.

        Returns:
            Expense: Unarchived expense instance.
        """
        if expense.is_archived:
            expense.is_archived = False
            expense.archived_at = None
            expense.updated_by = updated_by or expense.updated_by
            expense.save(update_fields=["is_archived", "archived_at", "updated_by", "updated_at"])

        return expense

    @classmethod
    def _normalize_payload(cls, *, payload: ExpenseWritePayload) -> dict[str, Any]:
        """Convert dataclass payload into normalized model-ready data.

        Args:
            payload: Incoming structured payload.

        Returns:
            dict[str, Any]: Model-ready data.
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
    def _validate_expense_data(cls, *, data: dict[str, Any]) -> None:
        """Run full service-layer validation for an expense write.

        Args:
            data: Normalized model-like data.

        Raises:
            ValidationError: If business rules are violated.
        """
        cls._validate_scope_shape(data=data)
        cls._validate_org_consistency(data=data)
        cls._validate_unit_building_consistency(data=data)
        cls._validate_lease_consistency_and_derivations(data=data)
        cls._validate_status_dates(data=data)
        cls._validate_reimbursement_state(data=data)

    @classmethod
    def _validate_scope_shape(cls, *, data: dict[str, Any]) -> None:
        """Validate required/null relationships based on expense scope."""
        scope = data["scope"]
        building = data.get("building")
        unit = data.get("unit")
        lease = data.get("lease")

        if scope == ExpenseScope.ORGANIZATION:
            if building or unit or lease:
                raise ValidationError(
                    "Organization-scoped expenses cannot reference building, unit, or lease."
                )

        elif scope == ExpenseScope.BUILDING:
            if not building:
                raise ValidationError("Building-scoped expenses require a building.")
            if unit or lease:
                raise ValidationError(
                    "Building-scoped expenses cannot reference unit or lease."
                )

        elif scope == ExpenseScope.UNIT:
            if not building or not unit:
                raise ValidationError(
                    "Unit-scoped expenses require both building and unit."
                )
            if lease:
                raise ValidationError("Unit-scoped expenses cannot reference a lease.")

        elif scope == ExpenseScope.LEASE:
            if not lease:
                raise ValidationError("Lease-scoped expenses require a lease.")

        else:
            raise ValidationError("Invalid expense scope.")

    @classmethod
    def _validate_org_consistency(cls, *, data: dict[str, Any]) -> None:
        """Validate that all related objects belong to the same organization."""
        organization = data["organization"]

        building = data.get("building")
        unit = data.get("unit")
        lease = data.get("lease")
        category = data.get("category")
        vendor = data.get("vendor")

        if building and building.organization_id != organization.id:
            raise ValidationError("Building does not belong to the selected organization.")

        if unit and unit.organization_id != organization.id:
            raise ValidationError("Unit does not belong to the selected organization.")

        if lease and lease.organization_id != organization.id:
            raise ValidationError("Lease does not belong to the selected organization.")

        if category and category.organization_id != organization.id:
            raise ValidationError("Category does not belong to the selected organization.")

        if vendor and vendor.organization_id != organization.id:
            raise ValidationError("Vendor does not belong to the selected organization.")

    @classmethod
    def _validate_unit_building_consistency(cls, *, data: dict[str, Any]) -> None:
        """Validate that the selected unit belongs to the selected building."""
        building = data.get("building")
        unit = data.get("unit")

        if unit and not building:
            raise ValidationError("A unit cannot be set without a building.")

        if unit and building and unit.building_id != building.id:
            raise ValidationError("Selected unit does not belong to the selected building.")

    @classmethod
    def _validate_lease_consistency_and_derivations(
        cls,
        *,
        data: dict[str, Any],
    ) -> None:
        """Validate lease consistency and derive building/unit from lease.

        For lease-scoped expenses, building and unit are deterministic facts
        derived from the lease relationship. The service layer persists them
        onto the expense for future reporting efficiency.
        """
        lease = data.get("lease")
        scope = data["scope"]

        if not lease:
            return

        lease_unit = getattr(lease, "unit", None)
        if lease_unit is None:
            raise ValidationError("Lease-scoped expense requires a lease with an associated unit.")

        lease_building = getattr(lease_unit, "building", None)
        if lease_building is None:
            raise ValidationError("Lease unit must belong to a building.")

        if scope != ExpenseScope.LEASE:
            raise ValidationError("A lease may only be attached to a lease-scoped expense.")

        incoming_building = data.get("building")
        incoming_unit = data.get("unit")

        if incoming_building and incoming_building.id != lease_building.id:
            raise ValidationError("Selected building does not match the lease building.")

        if incoming_unit and incoming_unit.id != lease_unit.id:
            raise ValidationError("Selected unit does not match the lease unit.")

        data["building"] = lease_building
        data["unit"] = lease_unit

    @classmethod
    def _validate_status_dates(cls, *, data: dict[str, Any]) -> None:
        """Validate status/date consistency for expense workflow."""
        status = data.get("status")
        paid_date = data.get("paid_date")

        if status == ExpenseStatus.PAID and not paid_date:
            raise ValidationError("Paid expenses must include a paid_date.")

        if status != ExpenseStatus.PAID and paid_date:
            raise ValidationError(
                "Only expenses with paid status may include a paid_date."
            )

        if status == ExpenseStatus.CANCELLED and paid_date:
            raise ValidationError("Cancelled expenses cannot have a paid_date.")

    @classmethod
    def _validate_reimbursement_state(cls, *, data: dict[str, Any]) -> None:
        """Validate reimbursement flags and status combinations."""
        is_reimbursable = data.get("is_reimbursable", False)
        reimbursement_status = data.get(
            "reimbursement_status",
            ReimbursementStatus.NOT_APPLICABLE,
        )

        if not is_reimbursable and reimbursement_status != ReimbursementStatus.NOT_APPLICABLE:
            raise ValidationError(
                "Non-reimbursable expenses must use reimbursement status 'not_applicable'."
            )

        if is_reimbursable and reimbursement_status == ReimbursementStatus.NOT_APPLICABLE:
            raise ValidationError(
                "Reimbursable expenses must use a reimbursement-aware status."
            )