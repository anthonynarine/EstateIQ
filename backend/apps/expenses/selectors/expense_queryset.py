"""
Base queryset builders for the expense intelligence domain.

This module contains the shared expense queryset foundation used by list,
detail, and reporting selectors.

Why this file exists:
- keep shared queryset composition in one place
- centralize select_related / annotation strategy
- prevent repeated list/detail query setup across selector modules
"""

from __future__ import annotations

from typing import Any

from django.db.models import Count, QuerySet

from apps.expenses.models import Expense


def get_expense_base_queryset(*, organization: Any) -> QuerySet[Expense]:
    """Return the base org-scoped expense queryset.

    This queryset is optimized for standard read paths and includes the most
    commonly needed relations for frontend-rich responses.

    Args:
        organization: Organization instance resolved for the request.

    Returns:
        QuerySet[Expense]: Org-scoped queryset with common relations loaded.
    """
    return (
        Expense.objects.filter(organization=organization)
        .select_related(
            "organization",
            "building",
            "unit",
            "lease",
            "category",
            "vendor",
            "created_by",
            "updated_by",
        )
        .annotate(attachment_count=Count("attachments", distinct=True))
        .order_by("-expense_date", "-id")
    )