"""
Reporting serializers for the expenses domain.

These serializers are shaped specifically for charting and reporting UI
contracts. They are intentionally aggregate-oriented rather than model-detail
oriented.

Typical frontend uses:
- monthly expense trend chart
- expense by category chart
- expense by building chart
- expense by unit chart
- dashboard/report payload composition
"""

from __future__ import annotations

from typing import Any

from rest_framework import serializers


class ExpenseMonthlyTrendPointSerializer(serializers.Serializer):
    """Single chart point for monthly expense trend visualizations."""

    month = serializers.SerializerMethodField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    def get_month(self, obj: dict[str, Any]) -> str | None:
        """Return a YYYY-MM chart label from a month bucket.

        Args:
            obj: Aggregated monthly trend row.

        Returns:
            str | None: YYYY-MM month label or None.
        """
        # Step 1: Resolve the month bucket from the aggregated row.
        month_bucket = obj.get("month_bucket")
        if month_bucket is None:
            return None

        # Step 2: Convert the bucket into a chart-safe label.
        return month_bucket.strftime("%Y-%m")


class ExpenseCategoryBreakdownSerializer(serializers.Serializer):
    """Aggregate row for expense-by-category charts."""

    category_id = serializers.IntegerField(allow_null=True)
    category_name = serializers.CharField()
    count = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class ExpenseBuildingBreakdownSerializer(serializers.Serializer):
    """Aggregate row for expense-by-building charts."""

    building_id = serializers.IntegerField(allow_null=True)
    building_name = serializers.CharField()
    count = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class ExpenseUnitBreakdownSerializer(serializers.Serializer):
    """Aggregate row for expense-by-unit charts."""

    unit_id = serializers.IntegerField(allow_null=True)
    unit_name = serializers.CharField()
    count = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class ExpenseReportingSummarySerializer(serializers.Serializer):
    """Compact KPI summary for expense reporting surfaces."""

    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense_count = serializers.IntegerField()
    average_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    period_start = serializers.DateField(allow_null=True)
    period_end = serializers.DateField(allow_null=True)


class ExpenseDashboardChartsSerializer(serializers.Serializer):
    """Grouped chart payload block for expense dashboards."""

    monthly_expense_trend = ExpenseMonthlyTrendPointSerializer(many=True)
    expense_by_category = ExpenseCategoryBreakdownSerializer(many=True)
    expense_by_building = ExpenseBuildingBreakdownSerializer(many=True)
    expense_by_unit = ExpenseUnitBreakdownSerializer(many=True, required=False)


class ExpenseDashboardSerializer(serializers.Serializer):
    """Unified dashboard payload for the expense reporting experience."""

    summary = ExpenseReportingSummarySerializer()
    charts = ExpenseDashboardChartsSerializer()