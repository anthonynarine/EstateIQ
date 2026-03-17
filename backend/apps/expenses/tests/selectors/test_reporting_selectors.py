"""Reporting selector tests for the expenses domain."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from apps.expenses.choices import ExpenseScope
from apps.expenses.selectors.expense_reporting_selectors import (
    expense_totals_by_building,
    expense_totals_by_category,
    monthly_expense_trend,
    summarize_expenses,
)

from apps.expenses.tests.factories import create_category, create_expense
from apps.expenses.tests.helpers import assert_decimal_equal

pytestmark = pytest.mark.django_db


# Step 1: Build selector coverage around reporting math and org isolation.
def test_summarize_expenses_returns_correct_totals_for_org(
    organization_a,
    organization_b,
    category_a,
    vendor_a,
):
    create_expense(
        organization=organization_a,
        title="Expense A1",
        amount="100.00",
        category=category_a,
        vendor=vendor_a,
        expense_date=date(2026, 1, 5),
    )
    create_expense(
        organization=organization_a,
        title="Expense A2",
        amount="50.00",
        category=category_a,
        vendor=vendor_a,
        expense_date=date(2026, 1, 10),
    )
    create_expense(
        organization=organization_b,
        title="Expense B1",
        amount="900.00",
        expense_date=date(2026, 1, 20),
    )

    summary = summarize_expenses(organization=organization_a, filters={})

    assert_decimal_equal(summary["total_amount"], Decimal("150.00"))
    assert summary["expense_count"] == 2
    assert_decimal_equal(summary["average_amount"], Decimal("75.00"))
    assert summary["period_start"] is None
    assert summary["period_end"] is None


# Step 2: Empty selector payloads should stay serializer-friendly.
def test_summarize_expenses_returns_clean_empty_payload(organization_a):
    summary = summarize_expenses(organization=organization_a, filters={})

    assert_decimal_equal(summary["total_amount"], Decimal("0.00"))
    assert summary["expense_count"] == 0
    assert_decimal_equal(summary["average_amount"], Decimal("0.00"))
    assert summary["period_start"] is None
    assert summary["period_end"] is None


# Step 3: Monthly trend should bucket and order by month.
def test_monthly_expense_trend_groups_rows_by_month(organization_a):
    create_expense(
        organization=organization_a,
        amount="10.00",
        expense_date=date(2026, 1, 2),
    )
    create_expense(
        organization=organization_a,
        amount="15.00",
        expense_date=date(2026, 1, 20),
    )
    create_expense(
        organization=organization_a,
        amount="30.00",
        expense_date=date(2026, 2, 3),
    )

    rows = monthly_expense_trend(organization=organization_a, filters={})

    assert len(rows) == 2
    assert rows[0]["month_bucket"].year == 2026
    assert rows[0]["month_bucket"].month == 1
    assert_decimal_equal(rows[0]["amount"], Decimal("25.00"))
    assert rows[1]["month_bucket"].year == 2026
    assert rows[1]["month_bucket"].month == 2
    assert_decimal_equal(rows[1]["amount"], Decimal("30.00"))


# Step 4: Category grouping must be stable and top_n aware.
def test_expense_totals_by_category_groups_and_honors_top_n(
    organization_a,
    category_a,
):
    category_two = create_category(organization=organization_a, name="Utilities")
    category_three = create_category(organization=organization_a, name="Mortgage")

    create_expense(
        organization=organization_a,
        category=category_a,
        amount="100.00",
    )
    create_expense(
        organization=organization_a,
        category=category_two,
        amount="250.00",
    )
    create_expense(
        organization=organization_a,
        category=category_three,
        amount="50.00",
    )

    rows = expense_totals_by_category(
        organization=organization_a,
        filters={},
        top_n=2,
    )

    assert len(rows) == 2
    assert rows[0]["category_name"] == "Utilities"
    assert_decimal_equal(rows[0]["amount"], Decimal("250.00"))
    assert rows[1]["category_name"] == "Repairs"
    assert_decimal_equal(rows[1]["amount"], Decimal("100.00"))


# Step 5: Building grouping must be stable and top_n aware.
def test_expense_totals_by_building_groups_and_honors_top_n(
    organization_a,
    building_a1,
    building_a2,
):
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        amount="200.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        amount="50.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a2,
        amount="150.00",
    )

    rows = expense_totals_by_building(
        organization=organization_a,
        filters={},
        top_n=1,
    )

    assert len(rows) == 1
    assert rows[0]["building_id"] == building_a1.id
    assert_decimal_equal(rows[0]["amount"], Decimal("250.00"))


# Step 6: Selector callers must pass explicit archive filters when needed.
def test_reporting_selectors_can_exclude_archived_when_filter_is_passed(
    organization_a,
    archived_expense_a,
):
    create_expense(
        organization=organization_a,
        amount="100.00",
        title="Active Expense",
    )

    summary = summarize_expenses(
        organization=organization_a,
        filters={"is_archived": False},
    )

    assert summary["expense_count"] == 1
    assert_decimal_equal(summary["total_amount"], Decimal("100.00"))


# Step 7: No cross-org leakage is acceptable on reporting selectors.
def test_reporting_selectors_respect_org_boundaries(
    organization_a,
    organization_b,
    category_a,
    category_b,
):
    create_expense(
        organization=organization_a,
        category=category_a,
        amount="40.00",
    )
    create_expense(
        organization=organization_b,
        category=category_b,
        amount="400.00",
    )

    category_rows = expense_totals_by_category(
        organization=organization_a,
        filters={},
    )
    summary = summarize_expenses(organization=organization_a, filters={})

    assert len(category_rows) == 1
    assert category_rows[0]["category_name"] == "Repairs"
    assert_decimal_equal(category_rows[0]["amount"], Decimal("40.00"))
    assert summary["expense_count"] == 1
    assert_decimal_equal(summary["total_amount"], Decimal("40.00"))
