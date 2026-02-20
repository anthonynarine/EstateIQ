# Filename: apps/billing/services/org_dashboard_service.py

"""
Org dashboard summary service.

Returns deterministic KPI metrics derived from Charges/Payments/Allocations.
No stored balances.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict

from django.db.models import Sum

from apps.billing.models import Allocation, Charge, ChargeKind, Payment


@dataclass(frozen=True)
class OrgDashboardSummary:
    """Computed KPI values for org dashboard."""
    as_of: date
    expected_rent_this_month: Decimal
    collected_this_month: Decimal
    outstanding_as_of: Decimal
    delinquent_leases_count: int
    unapplied_credits_total: Decimal


class OrgDashboardService:
    """Compute dashboard KPIs for an organization."""

    @staticmethod
    def _month_range(as_of: date) -> tuple[date, date]:
        # Step 1: month start and next month start (exclusive end)
        month_start = date(as_of.year, as_of.month, 1)
        if as_of.month == 12:
            next_month_start = date(as_of.year + 1, 1, 1)
        else:
            next_month_start = date(as_of.year, as_of.month + 1, 1)
        return month_start, next_month_start

    @staticmethod
    def compute(*, organization_id: int, as_of: date) -> OrgDashboardSummary:
        """
        Compute KPI summary for org.

        Args:
            organization_id: org PK.
            as_of: date used for "as-of" calculations.

        Returns:
            OrgDashboardSummary with derived metrics.
        """
        month_start, next_month_start = OrgDashboardService._month_range(as_of)

        # Step 1: expected rent this month (charges due within the month)
        expected_rent_this_month = (
            Charge.objects.filter(
                organization_id=organization_id,
                kind=ChargeKind.RENT,
                due_date__gte=month_start,
                due_date__lt=next_month_start,
            )
            .aggregate(total=Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

        # Step 2: collected this month = allocations applied to charges due this month
        collected_this_month = (
            Allocation.objects.filter(
                organization_id=organization_id,
                charge__kind=ChargeKind.RENT,
                charge__due_date__gte=month_start,
                charge__due_date__lt=next_month_start,
            )
            .aggregate(total=Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

        # Step 3: outstanding as_of = sum(unpaid balances) for charges due on/before as_of
        charges_due = list(
            Charge.objects.filter(
                organization_id=organization_id,
                due_date__lte=as_of,
            ).values("id", "lease_id", "amount")
        )

        if charges_due:
            charge_ids = [c["id"] for c in charges_due]
            alloc_map = {
                row["charge_id"]: (row["total"] or Decimal("0.00"))
                for row in (
                    Allocation.objects.filter(
                        organization_id=organization_id,
                        charge_id__in=charge_ids,
                    )
                    .values("charge_id")
                    .annotate(total=Sum("amount"))
                )
            }

            outstanding = Decimal("0.00")
            delinquent_leases = set()

            for c in charges_due:
                allocated = alloc_map.get(c["id"], Decimal("0.00"))
                remaining = c["amount"] - allocated
                if remaining > 0:
                    outstanding += remaining
                    delinquent_leases.add(c["lease_id"])

            outstanding_as_of = outstanding
            delinquent_leases_count = len(delinquent_leases)
        else:
            outstanding_as_of = Decimal("0.00")
            delinquent_leases_count = 0

        # Step 4: unapplied credits = payments - allocated_from_payments
        total_payments = (
            Payment.objects.filter(organization_id=organization_id)
            .aggregate(total=Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

        allocated_from_payments = (
            Allocation.objects.filter(organization_id=organization_id)
            .aggregate(total=Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

        unapplied_credits_total = total_payments - allocated_from_payments
        if unapplied_credits_total < 0:
            unapplied_credits_total = Decimal("0.00")

        return OrgDashboardSummary(
            as_of=as_of,
            expected_rent_this_month=expected_rent_this_month,
            collected_this_month=collected_this_month,
            outstanding_as_of=outstanding_as_of,
            delinquent_leases_count=delinquent_leases_count,
            unapplied_credits_total=unapplied_credits_total,
        )
