# Filename: backend/apps/billing/services/org_dashboard_service.py

"""
Organization dashboard summary service for the billing domain.

This module computes deterministic organization-level billing KPIs from the
ledger source of truth while delegating query-heavy read logic to selectors.

Why this file exists:
- Keeps organization dashboard KPI orchestration out of views.
- Preserves the ledger-first model by deriving values from immutable records.
- Provides a stable service contract for the reporting API surface.

Contract note:
The dashboard field `cash_applied_to_current_month_rent` is intentionally
allocation-driven. It represents cash applied to rent charges due in the
target month, not simply payments received by payment date.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from apps.billing.selectors import OrgDashboardSelectors

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OrgDashboardSummary:
    """
    Computed KPI values for the organization billing dashboard.

    Attributes:
        as_of: Report date used for all summary calculations.
        expected_rent_this_month: Sum of rent charges due in the report month.
        cash_applied_to_current_month_rent: Allocation-driven cash applied to
            rent charges due in the report month.
        outstanding_as_of: Total unpaid charge balance as of the report date.
        delinquent_leases_count: Number of leases with any unpaid balance.
        unapplied_credits_total: Total payment amount not yet allocated.
    """

    as_of: date
    expected_rent_this_month: Decimal
    cash_applied_to_current_month_rent: Decimal
    outstanding_as_of: Decimal
    delinquent_leases_count: int
    unapplied_credits_total: Decimal


class OrgDashboardService:
    """
    Compute organization-scoped dashboard KPIs for billing.

    This service is intentionally orchestration-focused. Query-heavy read logic
    belongs in selectors so the service can stay small, explicit, and easier
    to trust.
    """

    @classmethod
    def compute(
        cls,
        *,
        organization_id: int,
        as_of: date,
    ) -> OrgDashboardSummary:
        """
        Compute the organization dashboard summary.

        Args:
            organization_id: Active organization primary key.
            as_of: Report date used for all summary calculations.

        Returns:
            OrgDashboardSummary: Derived organization KPI summary.
        """
        # Step 1: derive the target month boundaries
        month_start, next_month_start = OrgDashboardSelectors.month_range(as_of)

        # Step 2: compute selector-driven read metrics
        expected_rent_this_month = OrgDashboardSelectors.expected_rent_this_month(
            organization_id=organization_id,
            month_start=month_start,
            next_month_start=next_month_start,
        )
        cash_applied_to_current_month_rent = (
            OrgDashboardSelectors.collected_this_month_preserved_behavior(
                organization_id=organization_id,
                month_start=month_start,
                next_month_start=next_month_start,
            )
        )
        outstanding_snapshot = OrgDashboardSelectors.outstanding_snapshot(
            organization_id=organization_id,
            as_of=as_of,
        )
        unapplied_credits_total = OrgDashboardSelectors.unapplied_credits_total(
            organization_id=organization_id,
        )

        # Step 3: emit an operational log for observability
        logger.info(
            "billing.dashboard_summary.computed",
            extra={
                "organization_id": organization_id,
                "as_of": as_of.isoformat(),
                "expected_rent_this_month": str(expected_rent_this_month),
                "cash_applied_to_current_month_rent": str(
                    cash_applied_to_current_month_rent
                ),
                "outstanding_as_of": str(outstanding_snapshot.outstanding_as_of),
                "delinquent_leases_count": outstanding_snapshot.delinquent_leases_count,
                "unapplied_credits_total": str(unapplied_credits_total),
            },
        )

        # Step 4: return the stable public service contract
        return OrgDashboardSummary(
            as_of=as_of,
            expected_rent_this_month=expected_rent_this_month,
            cash_applied_to_current_month_rent=(
                cash_applied_to_current_month_rent
            ),
            outstanding_as_of=outstanding_snapshot.outstanding_as_of,
            delinquent_leases_count=outstanding_snapshot.delinquent_leases_count,
            unapplied_credits_total=unapplied_credits_total,
        )