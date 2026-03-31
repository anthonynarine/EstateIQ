# Filename: backend/apps/billing/selectors/delinquency_selectors.py

"""
Delinquency selectors for the billing domain.

This module contains deterministic, organization-scoped read helpers for
computing delinquency and aging outputs from the billing ledger.

Why this file exists:
- Moves query-heavy delinquency logic out of the service layer.
- Creates an explicit read-model boundary for aging and delinquency reports.
- Preserves the current public delinquency behavior while preparing the billing
  domain for a broader selector-based architecture.

Current preserved behavior:
- Include charges due on or before the provided as-of date.
- Subtract allocations applied to those charges.
- Ignore fully paid charges.
- Bucket remaining balances by charge age:
  - 0 to 30 days
  - 31 to 60 days
  - 61 to 90 days
  - 90+ days
- Order results by largest outstanding balance first.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Sum

from apps.billing.models import Allocation, Charge


@dataclass(frozen=True)
class AgingBuckets:
    """
    Aging bucket totals for one lease.

    Attributes:
        current_0_30: Outstanding balance aged 0 to 30 days.
        days_31_60: Outstanding balance aged 31 to 60 days.
        days_61_90: Outstanding balance aged 61 to 90 days.
        days_90_plus: Outstanding balance aged more than 90 days.
    """

    current_0_30: Decimal
    days_31_60: Decimal
    days_61_90: Decimal
    days_90_plus: Decimal


@dataclass(frozen=True)
class LeaseDelinquencyRow:
    """
    Delinquency row for one lease.

    Attributes:
        lease_id: Lease primary key.
        total_outstanding: Total remaining unpaid balance for the lease.
        oldest_due_date: Oldest unpaid due date for the lease, if any.
        buckets: Aging bucket totals for the lease.
    """

    lease_id: int
    total_outstanding: Decimal
    oldest_due_date: date | None
    buckets: AgingBuckets


class DelinquencySelectors:
    """
    Deterministic read-side selectors for delinquency and aging reports.

    These selectors are organization-scoped and do not mutate billing records.
    They derive delinquency strictly from:
    - charges
    - allocations
    """

    @staticmethod
    def _charge_allocated_totals_by_charge_ids(
        *,
        organization_id: int,
        charge_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return allocation totals keyed by charge ID.

        Args:
            organization_id: Active organization primary key.
            charge_ids: Charge IDs to aggregate.

        Returns:
            dict[int, Decimal]: Allocation totals keyed by charge ID.
        """
        # Step 1: short-circuit empty workloads
        if not charge_ids:
            return {}

        # Step 2: aggregate allocations by charge
        rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                charge_id__in=charge_ids,
            )
            .values("charge_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["charge_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @staticmethod
    def _charges_due_as_of(
        *,
        organization_id: int,
        as_of: date,
    ) -> list[dict[str, Any]]:
        """
        Return organization-scoped charges due on or before the as-of date.

        Args:
            organization_id: Active organization primary key.
            as_of: Report date.

        Returns:
            list[dict[str, Any]]: Raw charge rows needed for aging math.
        """
        # Step 1: fetch due charges within the org boundary
        return list(
            Charge.objects.filter(
                organization_id=organization_id,
                due_date__lte=as_of,
            ).values("id", "lease_id", "amount", "due_date")
        )

    @classmethod
    def compute_for_org(
        cls,
        *,
        organization_id: int,
        as_of: date,
    ) -> list[LeaseDelinquencyRow]:
        """
        Compute delinquency rows for all leases in an organization.

        Args:
            organization_id: Active organization primary key.
            as_of: Report date used for aging.

        Returns:
            list[LeaseDelinquencyRow]: Delinquency rows ordered by descending
            outstanding balance.
        """
        # Step 1: fetch all candidate charges due by the report date
        charges = cls._charges_due_as_of(
            organization_id=organization_id,
            as_of=as_of,
        )

        # Step 2: short-circuit organizations with no due charges
        if not charges:
            return []

        # Step 3: build allocation totals by charge
        charge_ids = [charge["id"] for charge in charges]
        allocation_map = cls._charge_allocated_totals_by_charge_ids(
            organization_id=organization_id,
            charge_ids=charge_ids,
        )

        # Step 4: group remaining balances by lease and age bucket
        by_lease: dict[int, dict[str, Any]] = {}

        for charge in charges:
            lease_id = charge["lease_id"]
            allocated_total = allocation_map.get(charge["id"], Decimal("0.00"))
            remaining_balance = charge["amount"] - allocated_total

            if remaining_balance <= Decimal("0.00"):
                continue

            days_past_due = (as_of - charge["due_date"]).days

            if lease_id not in by_lease:
                by_lease[lease_id] = {
                    "total": Decimal("0.00"),
                    "oldest_due": charge["due_date"],
                    "b0_30": Decimal("0.00"),
                    "b31_60": Decimal("0.00"),
                    "b61_90": Decimal("0.00"),
                    "b90p": Decimal("0.00"),
                }

            record = by_lease[lease_id]
            record["total"] += remaining_balance

            if record["oldest_due"] is None or charge["due_date"] < record["oldest_due"]:
                record["oldest_due"] = charge["due_date"]

            if days_past_due <= 30:
                record["b0_30"] += remaining_balance
            elif days_past_due <= 60:
                record["b31_60"] += remaining_balance
            elif days_past_due <= 90:
                record["b61_90"] += remaining_balance
            else:
                record["b90p"] += remaining_balance

        # Step 5: build stable delinquency rows
        rows: list[LeaseDelinquencyRow] = []
        for lease_id, record in by_lease.items():
            rows.append(
                LeaseDelinquencyRow(
                    lease_id=lease_id,
                    total_outstanding=record["total"],
                    oldest_due_date=record["oldest_due"],
                    buckets=AgingBuckets(
                        current_0_30=record["b0_30"],
                        days_31_60=record["b31_60"],
                        days_61_90=record["b61_90"],
                        days_90_plus=record["b90p"],
                    ),
                )
            )

        # Step 6: order by largest outstanding balance first
        rows.sort(key=lambda row: row.total_outstanding, reverse=True)
        return rows