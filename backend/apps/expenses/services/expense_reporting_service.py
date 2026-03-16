
"""
Reporting orchestration helpers for expenses.

Important:
This file is intentionally kept thin.

Raw aggregation logic should live in selectors.
This service exists only to compose multiple precomputed datasets into a
dashboard/report contract that the frontend can consume directly.
"""

from __future__ import annotations

from typing import Any


class ExpenseReportingService:
    """Orchestrates chart-ready reporting payloads for the expenses domain."""

    @classmethod
    def build_dashboard_payload(
        cls,
        *,
        monthly_trend: list[dict[str, Any]],
        by_category: list[dict[str, Any]],
        by_building: list[dict[str, Any]],
        summary: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build a unified dashboard payload for the expenses frontend.

        Args:
            monthly_trend: Time-series expense data.
            by_category: Category breakdown data.
            by_building: Building breakdown data.
            summary: Optional KPI or totals block.

        Returns:
            dict[str, Any]: Frontend-ready reporting payload.
        """
        return {
            "summary": summary or {},
            "charts": {
                "monthly_expense_trend": monthly_trend,
                "expense_by_category": by_category,
                "expense_by_building": by_building,
            },
        }