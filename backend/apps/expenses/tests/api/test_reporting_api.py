# ✅ New Code

"""Reporting API tests for the expenses domain.

These tests dispatch ViewSet actions directly with APIRequestFactory so they do
not depend on project-level organization middleware wiring.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import force_authenticate

from apps.buildings.models import Unit
from apps.expenses.choices import ExpenseScope
from apps.expenses.tests.factories import create_category, create_expense
from apps.expenses.tests.helpers import assert_decimal_equal
from apps.expenses.views.reporting_views import ExpenseReportingViewSet

pytestmark = pytest.mark.django_db


def _call_reporting_action(*, api_rf, user, organization, action_name, query_string=""):
    """Dispatch a reporting ViewSet action with request.organization attached.

    Args:
        api_rf: DRF APIRequestFactory fixture.
        user: Authenticated user fixture.
        organization: Organization to attach to the request.
        action_name: ViewSet action route name.
        query_string: Optional raw query string.

    Returns:
        Response: Rendered DRF response.
    """
    # Step 1: Build the reporting endpoint path.
    path = f"/expense-reporting/{action_name}/"
    if query_string:
        path = f"{path}?{query_string}"

    # Step 2: Dispatch the direct ViewSet action.
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
        category=category_a,
        amount="300.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a2,
        category=category_a,
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
    assert category_response.data[0]["category_name"] == "Repairs"
    assert_decimal_equal(category_response.data[0]["amount"], Decimal("450.00"))

    assert building_response.status_code == 200
    assert len(building_response.data) == 1
    assert building_response.data[0]["building_id"] == building_a1.id
    assert_decimal_equal(building_response.data[0]["amount"], Decimal("300.00"))


# Step 4: Category reporting should include an Uncategorized bucket for null categories.
def test_by_category_includes_uncategorized_bucket(
    api_rf,
    user_a,
    organization_a,
):
    create_expense(
        organization=organization_a,
        amount="125.00",
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-category",
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["category_name"] == "Uncategorized"
    assert_decimal_equal(response.data[0]["amount"], Decimal("125.00"))


# Step 5: Reporting API should exclude archived rows by default.
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


# Step 6: Reporting API should never leak cross-org rows.
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


# Step 7: Category and building breakdown rows should expose count fields.
def test_breakdown_endpoints_include_count_fields(
    api_rf,
    user_a,
    organization_a,
    category_a,
    building_a1,
):
    create_expense(
        organization=organization_a,
        category=category_a,
        amount="50.00",
    )
    create_expense(
        organization=organization_a,
        category=category_a,
        amount="75.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        category=category_a,
        amount="300.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        category=category_a,
        amount="25.00",
    )

    category_response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-category",
    )
    building_response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-building",
        query_string=f"building={building_a1.id}",
    )

    assert category_response.status_code == 200
    assert category_response.data[0]["count"] == 4
    assert_decimal_equal(category_response.data[0]["amount"], Decimal("450.00"))

    assert building_response.status_code == 200
    assert len(building_response.data) == 1
    assert building_response.data[0]["building_id"] == building_a1.id
    assert building_response.data[0]["count"] == 2
    assert_decimal_equal(building_response.data[0]["amount"], Decimal("325.00"))


# Step 8: Unit reporting should require a building filter.
def test_by_unit_requires_building_filter(
    api_rf,
    user_a,
    organization_a,
):
    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-unit",
    )

    assert response.status_code == 400
    assert "building" in response.data


# Step 9: Unit reporting should return unit-scoped rows for the selected building only.
def test_by_unit_returns_rows_for_selected_building_only(
    api_rf,
    user_a,
    organization_a,
    building_a1,
    building_a2,
):
    unit_a1_1 = Unit.objects.create(
        organization=organization_a,
        building=building_a1,
        label="1A",
    )
    unit_a1_2 = Unit.objects.create(
        organization=organization_a,
        building=building_a1,
        label="1B",
    )
    unit_a2_1 = Unit.objects.create(
        organization=organization_a,
        building=building_a2,
        label="2A",
    )

    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="100.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="50.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_2,
        amount="25.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a2,
        unit=unit_a2_1,
        amount="999.00",
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-unit",
        query_string=f"building={building_a1.id}",
    )

    assert response.status_code == 200
    assert len(response.data) == 2

    first_row = response.data[0]
    second_row = response.data[1]

    assert first_row["unit_id"] == unit_a1_1.id
    assert first_row["unit_name"] == "1A"
    assert first_row["count"] == 2
    assert_decimal_equal(first_row["amount"], Decimal("150.00"))

    assert second_row["unit_id"] == unit_a1_2.id
    assert second_row["unit_name"] == "1B"
    assert second_row["count"] == 1
    assert_decimal_equal(second_row["amount"], Decimal("25.00"))


# Step 10: Unit reporting should exclude building-only expenses from the unit leaderboard.
def test_by_unit_excludes_non_unit_expenses(
    api_rf,
    user_a,
    organization_a,
    building_a1,
):
    unit_a1_1 = Unit.objects.create(
        organization=organization_a,
        building=building_a1,
        label="1A",
    )

    create_expense(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_a1,
        amount="500.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="75.00",
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-unit",
        query_string=f"building={building_a1.id}",
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["unit_id"] == unit_a1_1.id
    assert response.data[0]["count"] == 1
    assert_decimal_equal(response.data[0]["amount"], Decimal("75.00"))


# Step 11: Unit reporting should exclude archived rows by default.
def test_by_unit_excludes_archived_rows_by_default(
    api_rf,
    user_a,
    organization_a,
    building_a1,
):
    unit_a1_1 = Unit.objects.create(
        organization=organization_a,
        building=building_a1,
        label="1A",
    )

    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="40.00",
    )
    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="60.00",
        is_archived=True,
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-unit",
        query_string=f"building={building_a1.id}",
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["count"] == 1
    assert_decimal_equal(response.data[0]["amount"], Decimal("40.00"))


# Step 12: Unit reporting should not leak rows from another organization.
def test_by_unit_does_not_leak_cross_org_data(
    api_rf,
    user_a,
    organization_a,
    organization_b,
    building_a1,
):
    unit_a1_1 = Unit.objects.create(
        organization=organization_a,
        building=building_a1,
        label="1A",
    )

    create_expense(
        organization=organization_a,
        scope=ExpenseScope.UNIT,
        building=building_a1,
        unit=unit_a1_1,
        amount="80.00",
    )

    response = _call_reporting_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        action_name="by-unit",
        query_string=f"building={building_a1.id}",
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["unit_id"] == unit_a1_1.id
    assert response.data[0]["count"] == 1
    assert_decimal_equal(response.data[0]["amount"], Decimal("80.00"))