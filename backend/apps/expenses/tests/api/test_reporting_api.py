"""Reporting API tests for the expenses domain.

These tests dispatch ViewSet actions directly with APIRequestFactory so they do
not depend on project-level organization middleware wiring.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import force_authenticate

from apps.expenses.choices import ExpenseScope
from apps.expenses.views.reporting_views import ExpenseReportingViewSet

from apps.expenses.tests.factories import create_category, create_expense
from apps.expenses.tests.helpers import assert_decimal_equal

pytestmark = pytest.mark.django_db


def _call_reporting_action(*, api_rf, user, organization, action_name, query_string=""):
    """Dispatch a reporting ViewSet action with request.organization attached."""
    path = f"/expense-reporting/{action_name}/"
    if query_string:
        path = f"{path}?{query_string}"

    view = ExpenseReportingViewSet.as_view({"get": action_name.replace("-", "_")})
    request = api_rf.get(path)
    force_authenticate(request, user=user)
    request.organization = organization
    response = view(request)
    response.render()
    return response


# Step 1: Dashboard should return summary + chart blocks.
def test_dashboard_returns_summary_and_chart_blocks(
    api_rf,
    user_a,
    organization_a,
    category_a,
    building_a1,
):
    create_expense(
        organization=organization_a,
        category=category_a,
        amount="100.00",
        expense_date=date(2026, 1, 5),
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        amount="250.00",
        expense_date=date(2026, 2, 5),
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="dashboard",
    )

    assert response.status_code == 200
    assert set(response.data.keys()) == {"summary", "charts"}
    assert set(response.data["summary"].keys()) == {
        "total_amount",
        "expense_count",
        "average_amount",
        "period_start",
        "period_end",
    }
    assert set(response.data["charts"].keys()) == {
        "monthly_expense_trend",
        "expense_by_category",
        "expense_by_building",
    }
    assert_decimal_equal(response.data["summary"]["total_amount"], Decimal("350.00"))
    assert response.data["summary"]["expense_count"] == 2


# Step 2: Monthly trend should return chart-ready YYYY-MM rows.
def test_monthly_trend_returns_chart_ready_points(
    api_rf,
    user_a,
    organization_a,
):
    create_expense(
        organization=organization_a,
        amount="10.00",
        expense_date=date(2026, 1, 5),
    )
    create_expense(
        organization=organization_a,
        amount="15.00",
        expense_date=date(2026, 1, 20),
    )
    create_expense(
        organization=organization_a,
        amount="30.00",
        expense_date=date(2026, 2, 5),
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="monthly-trend",
    )

    assert response.status_code == 200
    assert response.data[0]["month"] == "2026-01"
    assert_decimal_equal(response.data[0]["amount"], Decimal("25.00"))
    assert response.data[1]["month"] == "2026-02"
    assert_decimal_equal(response.data[1]["amount"], Decimal("30.00"))


# Step 3: Category and building breakdowns should honor top_n.
def test_breakdown_endpoints_honor_top_n(
    api_rf,
    user_a,
    organization_a,
    category_a,
    building_a1,
    building_a2,
):
    category_two = create_category(organization=organization_a, name="Utilities")

    create_expense(
        organization=organization_a,
        category=category_a,
        amount="50.00",
    )
    create_expense(
        organization=organization_a,
        category=category_two,
        amount="200.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        amount="300.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a2,
        amount="100.00",
    )

    category_response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-category",
        query_string="top_n=1",
    )
    building_response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-building",
        query_string="top_n=1",
    )

    assert category_response.status_code == 200
    assert len(category_response.data) == 1
    assert category_response.data[0]["category_name"] == "Utilities"
    assert building_response.status_code == 200
    assert len(building_response.data) == 1
    assert building_response.data[0]["building_id"] == building_a1.id


# Step 4: Reporting API should exclude archived rows by default.
def test_reporting_api_excludes_archived_by_default(
    api_rf,
    user_a,
    organization_a,
):
    create_expense(organization=organization_a, amount="100.00")
    create_expense(
        organization=organization_a,
        amount="25.00",
        is_archived=True,
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="dashboard",
    )

    assert response.status_code == 200
    assert response.data["summary"]["expense_count"] == 1
    assert_decimal_equal(response.data["summary"]["total_amount"], Decimal("100.00"))


# Step 5: Reporting API should never leak cross-org rows.
def test_reporting_api_does_not_leak_cross_org_data(
    api_rf,
    user_a,
    organization_a,
    organization_b,
):
    create_expense(organization=organization_a, amount="100.00")
    create_expense(organization=organization_b, amount="999.00")

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="dashboard",
    )

    assert response.status_code == 200
    assert response.data["summary"]["expense_count"] == 1
    assert_decimal_equal(response.data["summary"]["total_amount"], Decimal("100.00"))
