# ✅ New Code
"""
Public selector exports for the expenses domain.

This file provides a stable import surface for the rest of the app.
"""

from apps.expenses.selectors.expense_detail_selectors import get_expense_detail
from apps.expenses.selectors.expense_list_selectors import (
    list_expenses,
    list_unpaid_expenses,
)
from apps.expenses.selectors.expense_queryset import get_expense_base_queryset
from apps.expenses.selectors.expense_reporting_selectors import (
    expense_totals_by_building,
    expense_totals_by_category,
    monthly_expense_trend,
    summarize_expenses,
)
from apps.expenses.selectors.lookup_selectors import (
    list_expense_categories,
    list_vendors,
)

__all__ = [
    "get_expense_base_queryset",
    "get_expense_detail",
    "list_expense_categories",
    "list_expenses",
    "list_unpaid_expenses",
    "list_vendors",
    "expense_totals_by_building",
    "expense_totals_by_category",
    "monthly_expense_trend",
    "summarize_expenses",
]