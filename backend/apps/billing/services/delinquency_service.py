# Filename: apps/billing/services/delinquency_service.py

"""
Delinquency (A/R aging) service.

Computes outstanding balances and aging buckets as-of a date.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from django.db.models import Sum

from apps.billing.models import Allocation, Charge
from apps.billing.models import ChargeKind  # optional if you want to filter kinds


@dataclass(frozen=True)
class AgingBuckets:
    """A/R aging buckets."""
    current_0_30: Decimal
    days_31_60: Decimal
    days_61_90: Decimal
    days_90_plus: Decimal


@dataclass(frozen=True)
class LeaseDelinquencyRow:
    """Delinquency row for a lease."""
    lease_id: int
    total_outstanding: Decimal
    oldest_due_date: Optional[date]
    buckets: AgingBuckets


class DelinquencyService:
    """Compute delinquency and aging as-of a date."""

    @staticmethod
    def _charge_allocated_totals_by_charge_ids(charge_ids: List[int]) -> Dict[int, Decimal]:
        # Step 1: aggregate allocations per charge
        rows = (
            Allocation.objects.filter(charge_id__in=charge_ids)
            .values("charge_id")
            .annotate(total=Sum("amount"))
        )
        return {r["charge_id"]: (r["total"] or Decimal("0.00")) for r in rows}

    @staticmethod
    def compute_for_org(*, organization_id: int, as_of: date) -> List[LeaseDelinquencyRow]:
        """
        Compute delinquency for all leases in an org as-of a date.

        Args:
            organization_id: org PK.
            as_of: date to age against (inclusive).

        Returns:
            List of LeaseDelinquencyRow.
        """
        # Step 1: fetch all charges due on/before as_of (org scoped)
        charges = list(
            Charge.objects.filter(
                organization_id=organization_id,
                due_date__lte=as_of,
            ).values("id", "lease_id", "amount", "due_date")
        )

        if not charges:
            return []

        charge_ids = [c["id"] for c in charges]
        alloc_map = DelinquencyService._charge_allocated_totals_by_charge_ids(charge_ids)

        # Step 2: group per lease and bucket amounts by age
        by_lease: Dict[int, Dict] = {}

        for c in charges:
            lease_id = c["lease_id"]
            allocated = alloc_map.get(c["id"], Decimal("0.00"))
            remaining = c["amount"] - allocated
            if remaining <= 0:
                continue

            days_past_due = (as_of - c["due_date"]).days

            if lease_id not in by_lease:
                by_lease[lease_id] = {
                    "total": Decimal("0.00"),
                    "oldest_due": c["due_date"],
                    "b0_30": Decimal("0.00"),
                    "b31_60": Decimal("0.00"),
                    "b61_90": Decimal("0.00"),
                    "b90p": Decimal("0.00"),
                }

            rec = by_lease[lease_id]
            rec["total"] += remaining
            if rec["oldest_due"] is None or c["due_date"] < rec["oldest_due"]:
                rec["oldest_due"] = c["due_date"]

            # Step 3: bucket
            if days_past_due <= 30:
                rec["b0_30"] += remaining
            elif days_past_due <= 60:
                rec["b31_60"] += remaining
            elif days_past_due <= 90:
                rec["b61_90"] += remaining
            else:
                rec["b90p"] += remaining

        # Step 4: format rows
        results: List[LeaseDelinquencyRow] = []
        for lease_id, rec in by_lease.items():
            results.append(
                LeaseDelinquencyRow(
                    lease_id=lease_id,
                    total_outstanding=rec["total"],
                    oldest_due_date=rec["oldest_due"],
                    buckets=AgingBuckets(
                        current_0_30=rec["b0_30"],
                        days_31_60=rec["b31_60"],
                        days_61_90=rec["b61_90"],
                        days_90_plus=rec["b90p"],
                    ),
                )
            )

        # Step 5: stable ordering (largest delinquency first)
        results.sort(key=lambda r: r.total_outstanding, reverse=True)
        return results
