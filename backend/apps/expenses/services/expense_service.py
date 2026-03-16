
"""
Public facade for expense domain service workflows.

This facade preserves a stable import surface for the rest of the application
while allowing the internal service implementation to be split by
responsibility.
"""

from __future__ import annotations

from typing import Any

from apps.expenses.models import Expense
from apps.expenses.services.expense_archive_service import (
    ExpenseArchiveService,
)
from apps.expenses.services.expense_payloads import ExpenseWritePayload
from apps.expenses.services.expense_reporting_service import (
    ExpenseReportingService,
)
from apps.expenses.services.expense_validation_service import (
    ExpenseValidationService,
)
from apps.expenses.services.expense_write_service import ExpenseWriteService


class ExpenseService:
    """Facade service for expense workflows."""

    @classmethod
    def create_expense(cls, *, payload: ExpenseWritePayload) -> Expense:
        """Create a validated expense record."""
        return ExpenseWriteService.create_expense(payload=payload)

    @classmethod
    def update_expense(
        cls,
        *,
        expense: Expense,
        updates: dict[str, Any],
        updated_by: Any | None = None,
    ) -> Expense:
        """Update an existing expense."""
        return ExpenseWriteService.update_expense(
            expense=expense,
            updates=updates,
            updated_by=updated_by,
        )

    @classmethod
    def archive_expense(
        cls,
        *,
        expense: Expense,
        updated_by: Any | None = None,
    ) -> Expense:
        """Archive an expense."""
        return ExpenseArchiveService.archive_expense(
            expense=expense,
            updated_by=updated_by,
        )

    @classmethod
    def unarchive_expense(
        cls,
        *,
        expense: Expense,
        updated_by: Any | None = None,
    ) -> Expense:
        """Restore an archived expense."""
        return ExpenseArchiveService.unarchive_expense(
            expense=expense,
            updated_by=updated_by,
        )

    @classmethod
    def validate_expense_data(cls, *, data: dict[str, Any]) -> None:
        """Run full expense validation."""
        ExpenseValidationService.validate_expense_data(data=data)

    @classmethod
    def build_dashboard_payload(
        cls,
        *,
        monthly_trend: list[dict[str, Any]],
        by_category: list[dict[str, Any]],
        by_building: list[dict[str, Any]],
        summary: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build a unified reporting payload for expense dashboards."""
        return ExpenseReportingService.build_dashboard_payload(
            monthly_trend=monthly_trend,
            by_category=by_category,
            by_building=by_building,
            summary=summary,
        )