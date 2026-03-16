"""
List-oriented selectors for the expense intelligence domain.

This module owns collection-style read queries for expenses, including:
- general expense list views
- filtered expense tables
- unpaid operational queues

These selectors are intended to power frontend collection screens while keeping
views thin and queryset logic centralized.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Q, QuerySet

from apps.expenses.choices import ExpenseStatus
from apps.expenses.models import Expense
from apps.expenses.selectors.expense_queryset import get_expense_base_queryset


def list_expenses(
    *,
    organization: Any,
    filters: dict[str, Any] | None = None,
) -> QuerySet[Expense]:
    """Return a filtered expense queryset for list endpoints.

    Supported filters:
    - building
    - unit
    - lease
    - category
    - vendor
    - status
    - scope
    - reimbursement_status
    - is_reimbursable
    - is_archived
    - expense_date_from / expense_date_to
    - due_date_from / due_date_to
    - search

    Args:
        organization: Organization instance resolved for the request.
        filters: Optional normalized filter dictionary.

    Returns:
        QuerySet[Expense]: Filtered org-scoped queryset.
    """
    queryset = get_expense_base_queryset(organization=organization)
    filters = filters or {}

    building_id = filters.get("building")
    unit_id = filters.get("unit")
    lease_id = filters.get("lease")
    category_id = filters.get("category")
    vendor_id = filters.get("vendor")
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

    if building_id:
        queryset = queryset.filter(building_id=building_id)

    if unit_id:
        queryset = queryset.filter(unit_id=unit_id)

    if lease_id:
        queryset = queryset.filter(lease_id=lease_id)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    if vendor_id:
        queryset = queryset.filter(vendor_id=vendor_id)

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
            | Q(vendor__name__icontains=search)
            | Q(category__name__icontains=search)
        )

    return queryset


def list_unpaid_expenses(
    *,
    organization: Any,
    building_id: int | None = None,
) -> QuerySet[Expense]:
    """Return unpaid expenses for operational queue views.

    Args:
        organization: Organization instance resolved for the request.
        building_id: Optional building filter.

    Returns:
        QuerySet[Expense]: Unpaid expenses ordered by urgency.
    """
    queryset = get_expense_base_queryset(organization=organization).filter(
        is_archived=False,
        status__in=[ExpenseStatus.SUBMITTED, ExpenseStatus.DUE],
    )

    if building_id:
        queryset = queryset.filter(building_id=building_id)

    return queryset.order_by("due_date", "expense_date", "id")