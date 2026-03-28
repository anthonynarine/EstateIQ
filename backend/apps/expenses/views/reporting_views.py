# ✅ New Code

"""
Reporting ViewSet definitions for the expenses domain.

This module owns chart/reporting-oriented endpoints for expenses so the normal
expense CRUD surface can remain focused on record management.

Current endpoints:
- dashboard
- monthly trend
- by category
- by building
- by unit
"""

from __future__ import annotations

from typing import Any

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.expenses.selectors.expense_reporting_selectors import (
    expense_totals_by_building,
    expense_totals_by_category,
    expense_totals_by_unit,
    monthly_expense_trend,
    summarize_expenses,
)
from apps.expenses.serializers.reporting_serializers import (
    ExpenseBuildingBreakdownSerializer,
    ExpenseCategoryBreakdownSerializer,
    ExpenseDashboardSerializer,
    ExpenseMonthlyTrendPointSerializer,
    ExpenseUnitBreakdownSerializer,
)
from apps.expenses.services import ExpenseService
from apps.expenses.views.mixins import OrganizationScopedViewMixin


class ExpenseReportingViewSet(
    OrganizationScopedViewMixin,
    viewsets.ViewSet,
):
    """Dedicated reporting API surface for expenses."""

    def get_serializer_context(self) -> dict[str, Any]:
        """Return serializer context for the current request.

        Returns:
            dict[str, Any]: Request-aware serializer context.
        """
        # Step 1: Expose the request and resolved organization to serializers.
        return {
            "request": self.request,
            "organization": self._get_request_organization(),
        }

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """Return a unified dashboard payload for expenses reporting."""
        # Step 1: Resolve org, filters, and endpoint options.
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        # Step 2: Build the current dashboard payload blocks.
        summary = summarize_expenses(
            organization=organization,
            filters=filters,
        )
        monthly_trend = monthly_expense_trend(
            organization=organization,
            filters=filters,
        )
        by_category = expense_totals_by_category(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )
        by_building = expense_totals_by_building(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )

        # Step 3: Delegate payload composition to the service layer.
        payload = ExpenseService.build_dashboard_payload(
            summary=summary,
            monthly_trend=monthly_trend,
            by_category=by_category,
            by_building=by_building,
        )

        # Step 4: Serialize and return the dashboard contract.
        serializer = ExpenseDashboardSerializer(
            payload,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="monthly-trend")
    def monthly_trend(self, request):
        """Return monthly expense trend chart data."""
        # Step 1: Resolve the org-scoped reporting filters.
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()

        # Step 2: Fetch deterministic monthly trend rows.
        data = monthly_expense_trend(
            organization=organization,
            filters=filters,
        )

        # Step 3: Serialize the reporting contract.
        serializer = ExpenseMonthlyTrendPointSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="by-category")
    def by_category(self, request):
        """Return expense totals grouped by category."""
        # Step 1: Resolve org, filters, and endpoint options.
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        # Step 2: Fetch category breakdown rows.
        data = expense_totals_by_category(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )

        # Step 3: Serialize the reporting contract.
        serializer = ExpenseCategoryBreakdownSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="by-building")
    def by_building(self, request):
        """Return expense totals grouped by building."""
        # Step 1: Resolve org, filters, and endpoint options.
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        # Step 2: Fetch building breakdown rows.
        data = expense_totals_by_building(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )

        # Step 3: Serialize the reporting contract.
        serializer = ExpenseBuildingBreakdownSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="by-unit")
    def by_unit(self, request):
        """Return expense totals grouped by unit.

        Product rule:
            Unit comparison is only meaningful within a selected building
            context. This endpoint therefore requires a building filter.

        Raises:
            ValidationError: If no building filter is supplied.
        """
        # Step 1: Resolve org, filters, and endpoint options.
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        # Step 2: Enforce the building-context requirement at the API boundary.
        if not filters.get("building"):
            raise ValidationError(
                {
                    "building": (
                        "A building filter is required for unit comparison "
                        "reporting."
                    )
                }
            )

        # Step 3: Fetch unit breakdown rows scoped to the selected building.
        data = expense_totals_by_unit(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )

        # Step 4: Serialize the reporting contract.
        serializer = ExpenseUnitBreakdownSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)