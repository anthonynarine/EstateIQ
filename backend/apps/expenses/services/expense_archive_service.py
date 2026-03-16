
"""
Archive and restore workflows for expenses.
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.expenses.models import Expense


class ExpenseArchiveService:
    """Service for archive and restore operations on expenses."""

    @classmethod
    @transaction.atomic
    def archive_expense(
        cls,
        *,
        expense: Expense,
        updated_by: Any | None = None,
    ) -> Expense:
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
            expense.save(
                update_fields=[
                    "is_archived",
                    "archived_at",
                    "updated_by",
                    "updated_at",
                ]
            )

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
            expense.save(
                update_fields=[
                    "is_archived",
                    "archived_at",
                    "updated_by",
                    "updated_at",
                ]
            )

        return expense