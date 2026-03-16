
"""
Reporting ViewSet definitions for the expenses domain.

This module owns chart/reporting-oriented endpoints for expenses so the normal
expense CRUD surface can remain focused on record management.

Current endpoints:
- dashboard
- monthly trend
- by category
- by building
"""

from __future__ import annotations

from typing import Any

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.expenses.selectors.expense_reporting_selectors import (
    expense_totals_by_building,
    expense_totals_by_category,
    monthly_expense_trend,
    summarize_expenses,
)
from apps.expenses.serializers.reporting_serializers import (
    ExpenseBuildingBreakdownSerializer,
    ExpenseCategoryBreakdownSerializer,
    ExpenseDashboardSerializer,
    ExpenseMonthlyTrendPointSerializer,
)
from apps.expenses.services import ExpenseService
from apps.expenses.views.mixins import OrganizationScopedViewMixin


class ExpenseReportingViewSet(
    OrganizationScopedViewMixin,
    viewsets.ViewSet,
):
    """Dedicated reporting API surface for expenses."""

    def get_serializer_context(self) -> dict[str, Any]:
        """Return serializer context for the current request."""
        return {
            "request": self.request,
            "organization": self._get_request_organization(),
        }

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """Return a unified dashboard payload for expenses reporting."""
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

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

        payload = ExpenseService.build_dashboard_payload(
            summary=summary,
            monthly_trend=monthly_trend,
            by_category=by_category,
            by_building=by_building,
        )
        serializer = ExpenseDashboardSerializer(
            payload,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="monthly-trend")
    def monthly_trend(self, request):
        """Return monthly expense trend chart data."""
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()

        data = monthly_expense_trend(
            organization=organization,
            filters=filters,
        )
        serializer = ExpenseMonthlyTrendPointSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="by-category")
    def by_category(self, request):
        """Return expense totals grouped by category."""
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        data = expense_totals_by_category(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )
        serializer = ExpenseCategoryBreakdownSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="by-building")
    def by_building(self, request):
        """Return expense totals grouped by building."""
        organization = self._get_request_organization()
        filters = self._build_reporting_filters()
        options = self._build_reporting_options()

        data = expense_totals_by_building(
            organization=organization,
            filters=filters,
            top_n=options["top_n"],
        )
        serializer = ExpenseBuildingBreakdownSerializer(
            data,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)