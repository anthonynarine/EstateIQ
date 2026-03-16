"""
Detail-oriented selectors for the expense intelligence domain.

This module owns single-record expense retrieval logic. Keeping detail selectors
separate from list selectors helps preserve clear read-model boundaries and
makes future detail-specific queryset tuning easier.
"""

from __future__ import annotations

from typing import Any

from apps.expenses.models import Expense
from apps.expenses.selectors.expense_queryset import get_expense_base_queryset


def get_expense_detail(*, organization: Any, expense_id: int) -> Expense:
    """Return a single org-scoped expense with detail relations.

    Args:
        organization: Organization instance resolved for the request.
        expense_id: Expense primary key.

    Returns:
        Expense: Matching org-scoped expense.

    Raises:
        Expense.DoesNotExist: If no matching record exists.
    """
    return get_expense_base_queryset(organization=organization).get(id=expense_id)