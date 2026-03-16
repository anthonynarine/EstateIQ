"""
Lookup selectors for the expense intelligence domain.

This module owns lightweight org-scoped lookup querysets used by category and
vendor endpoints. These are supporting reads, not core expense reads.
"""

from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from apps.expenses.models import ExpenseCategory, Vendor


def list_expense_categories(*, organization: Any) -> QuerySet[ExpenseCategory]:
    """Return org-scoped expense categories ordered for UI use.

    Args:
        organization: Organization instance resolved for the request.

    Returns:
        QuerySet[ExpenseCategory]: Ordered org-scoped categories.
    """
    return (
        ExpenseCategory.objects.filter(organization=organization)
        .select_related("parent")
        .order_by("sort_order", "name")
    )


def list_vendors(*, organization: Any) -> QuerySet[Vendor]:
    """Return org-scoped vendors ordered for UI use.

    Args:
        organization: Organization instance resolved for the request.

    Returns:
        QuerySet[Vendor]: Ordered org-scoped vendors.
    """
    return Vendor.objects.filter(organization=organization).order_by("name")