"""
Reporting and aggregation selectors for the expense intelligence domain.

This module owns grouped and aggregate read queries that support:
- monthly summaries
- category totals
- vendor totals
- dashboard cards
- future AI explanation inputs

These selectors should remain deterministic and grounded in stored expense data.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Count, Q, Sum

from apps.expenses.choices import ExpenseStatus
from apps.expenses.models import Expense


def summarize_expenses_by_category(
    *,
    organization: Any,
    start_date: date,
    end_date: date,
    building_id: int | None = None,
):
    """Return grouped expense totals by category.

    Args:
        organization: Organization instance resolved for the request.
        start_date: Inclusive start date.
        end_date: Inclusive end date.
        building_id: Optional building filter.

    Returns:
        QuerySet: Values queryset grouped by category.
    """
    queryset = Expense.objects.filter(
        organization=organization,
        expense_date__gte=start_date,
        expense_date__lte=end_date,
        is_archived=False,
    )

    if building_id:
        queryset = queryset.filter(building_id=building_id)

    return (
        queryset.values(
            "category_id",
            "category__name",
            "category__kind",
        )
        .annotate(
            total_amount=Sum("amount"),
            expense_count=Count("id"),
        )
        .order_by("-total_amount", "category__name")
    )


def summarize_expenses_by_vendor(
    *,
    organization: Any,
    start_date: date,
    end_date: date,
    building_id: int | None = None,
):
    """Return grouped expense totals by vendor.

    Args:
        organization: Organization instance resolved for the request.
        start_date: Inclusive start date.
        end_date: Inclusive end date.
        building_id: Optional building filter.

    Returns:
        QuerySet: Values queryset grouped by vendor.
    """
    queryset = Expense.objects.filter(
        organization=organization,
        expense_date__gte=start_date,
        expense_date__lte=end_date,
        is_archived=False,
    )

    if building_id:
        queryset = queryset.filter(building_id=building_id)

    return (
        queryset.values(
            "vendor_id",
            "vendor__name",
        )
        .annotate(
            total_amount=Sum("amount"),
            expense_count=Count("id"),
        )
        .order_by("-total_amount", "vendor__name")
    )


def summarize_monthly_expenses(
    *,
    organization: Any,
    start_date: date,
    end_date: date,
    building_id: int | None = None,
) -> dict[str, Any]:
    """Return a compact aggregate summary for a monthly reporting window.

    Args:
        organization: Organization instance resolved for the request.
        start_date: Inclusive start date.
        end_date: Inclusive end date.
        building_id: Optional building filter.

    Returns:
        dict[str, Any]: Deterministic aggregate metrics.
    """
    queryset = Expense.objects.filter(
        organization=organization,
        expense_date__gte=start_date,
        expense_date__lte=end_date,
        is_archived=False,
    )

    if building_id:
        queryset = queryset.filter(building_id=building_id)

    aggregates = queryset.aggregate(
        total_amount=Sum("amount"),
        paid_amount=Sum("amount", filter=Q(status=ExpenseStatus.PAID)),
        unpaid_amount=Sum(
            "amount",
            filter=Q(status__in=[ExpenseStatus.SUBMITTED, ExpenseStatus.DUE]),
        ),
        expense_count=Count("id"),
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "building_id": building_id,
        "expense_count": aggregates["expense_count"] or 0,
        "total_amount": aggregates["total_amount"] or Decimal("0.00"),
        "paid_amount": aggregates["paid_amount"] or Decimal("0.00"),
        "unpaid_amount": aggregates["unpaid_amount"] or Decimal("0.00"),
    }