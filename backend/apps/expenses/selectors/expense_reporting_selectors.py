
"""
Reporting selectors for the expenses domain.

This module owns aggregate and chart-oriented read logic for expenses.

Important:
- Views should not build reporting querysets directly.
- Services should not own raw aggregation logic.
- Reporting selectors should remain deterministic and organization-scoped.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Avg, Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth

from apps.expenses.models import Expense


def _apply_common_reporting_filters(
    *,
    queryset,
    filters: dict[str, Any],
):
    """Apply normalized reporting filters to a base expense queryset."""
    building = filters.get("building")
    unit = filters.get("unit")
    lease = filters.get("lease")
    category = filters.get("category")
    vendor = filters.get("vendor")
    status = filters.get("status")
    scope = filters.get("scope")
    reimbursement_status = filters.get("reimbursement_status")
    is_reimbursable = filters.get("is_reimbursable")
    is_archived = filters.get("is_archived")
    expense_date_from = filters.get("expense_date_from")
    expense_date_to = filters.get("expense_date_to")
    due_date_from = filters.get("due_date_from")
    due_date_to = filters.get("due_date_to")
    search = filters.get("search")

    if building:
        queryset = queryset.filter(building_id=building)

    if unit:
        queryset = queryset.filter(unit_id=unit)

    if lease:
        queryset = queryset.filter(lease_id=lease)

    if category:
        queryset = queryset.filter(category_id=category)

    if vendor:
        queryset = queryset.filter(vendor_id=vendor)

    if status:
        queryset = queryset.filter(status=status)

    if scope:
        queryset = queryset.filter(scope=scope)

    if reimbursement_status:
        queryset = queryset.filter(reimbursement_status=reimbursement_status)

    if is_reimbursable is not None:
        queryset = queryset.filter(is_reimbursable=is_reimbursable)

    if is_archived is not None:
        queryset = queryset.filter(is_archived=is_archived)

    if expense_date_from:
        queryset = queryset.filter(expense_date__gte=expense_date_from)

    if expense_date_to:
        queryset = queryset.filter(expense_date__lte=expense_date_to)

    if due_date_from:
        queryset = queryset.filter(due_date__gte=due_date_from)

    if due_date_to:
        queryset = queryset.filter(due_date__lte=due_date_to)

    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(invoice_number__icontains=search)
            | Q(external_reference__icontains=search)
            | Q(notes__icontains=search)
        )

    return queryset


def _base_reporting_queryset(
    *,
    organization,
    filters: dict[str, Any],
):
    """Return the org-scoped base queryset for expense reporting."""
    queryset = Expense.objects.filter(organization=organization)
    return _apply_common_reporting_filters(queryset=queryset, filters=filters)


def summarize_expenses(
    *,
    organization,
    filters: dict[str, Any],
) -> dict[str, Any]:
    """Return top-level summary metrics for expense reporting."""
    queryset = _base_reporting_queryset(
        organization=organization,
        filters=filters,
    )

    summary = queryset.aggregate(
        total_amount=Coalesce(
            Sum("amount"),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
        expense_count=Count("id"),
        average_amount=Coalesce(
            Avg("amount"),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
    )

    return {
        "total_amount": summary["total_amount"],
        "expense_count": summary["expense_count"],
        "average_amount": summary["average_amount"],
        "period_start": filters.get("expense_date_from"),
        "period_end": filters.get("expense_date_to"),
    }


def monthly_expense_trend(
    *,
    organization,
    filters: dict[str, Any],
) -> list[dict[str, Any]]:
    """Return grouped monthly expense totals for trend charts."""
    queryset = _base_reporting_queryset(
        organization=organization,
        filters=filters,
    )

    rows = (
        queryset.annotate(month_bucket=TruncMonth("expense_date"))
        .values("month_bucket")
        .annotate(
            amount=Coalesce(
                Sum("amount"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
        .order_by("month_bucket")
    )

    return list(rows)


def expense_totals_by_category(
    *,
    organization,
    filters: dict[str, Any],
    top_n: int | None = None,
) -> list[dict[str, Any]]:
    """Return grouped expense totals by category."""
    queryset = _base_reporting_queryset(
        organization=organization,
        filters=filters,
    )

    rows = (
        queryset.values("category_id", "category__name")
        .annotate(
            amount=Coalesce(
                Sum("amount"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
        .order_by("-amount", "category__name", "category_id")
    )

    if top_n:
        rows = rows[:top_n]

    return [
        {
            "category_id": row["category_id"],
            "category_name": row["category__name"] or "Uncategorized",
            "amount": row["amount"],
        }
        for row in rows
    ]


def expense_totals_by_building(
    *,
    organization,
    filters: dict[str, Any],
    top_n: int | None = None,
) -> list[dict[str, Any]]:
    """Return grouped expense totals by building."""
    queryset = _base_reporting_queryset(
        organization=organization,
        filters=filters,
    )

    rows = (
        queryset.values("building_id", "building__name")
        .annotate(
            amount=Coalesce(
                Sum("amount"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
        .order_by("-amount", "building__name", "building_id")
    )

    if top_n:
        rows = rows[:top_n]

    return [
        {
            "building_id": row["building_id"],
            "building_name": row["building__name"] or "Portfolio / Unassigned",
            "amount": row["amount"],
        }
        for row in rows
    ]