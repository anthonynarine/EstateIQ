# Filename: apps/billing/services/lease_ledger_service.py

"""
Lease ledger query service.

Builds a deterministic statement for a lease from:
- Charges
- Payments
- Allocations

No stored balances. All balances are derived.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List

from django.db.models import Sum

from apps.billing.models import Allocation, Charge, Payment


@dataclass(frozen=True)
class LedgerChargeRow:
    """A charge row with computed allocation totals and remaining balance."""
    id: int
    kind: str
    amount: Decimal
    due_date: str
    allocated_total: Decimal
    balance: Decimal
    notes: str


@dataclass(frozen=True)
class LedgerPaymentRow:
    """A payment row with computed allocation totals and remaining unapplied."""
    id: int
    amount: Decimal
    paid_at: str
    method: str
    allocated_total: Decimal
    unapplied: Decimal
    notes: str


class LeaseLedgerService:
    """Build ledger views for a lease."""

    @staticmethod
    def build_lease_ledger(*, organization_id: int, lease_id: int) -> Dict:
        """
        Build the ledger for a lease.

        Args:
            organization_id: Organization PK for tenant boundary enforcement.
            lease_id: Lease PK.

        Returns:
            Dict with charges, payments, allocations, and computed totals.
        """
        # Step 1: load charges and payments for the lease (org-scoped)
        charges = list(
            Charge.objects.filter(organization_id=organization_id, lease_id=lease_id)
            .order_by("due_date", "created_at", "id")
            .values("id", "kind", "amount", "due_date", "notes")
        )
        payments = list(
            Payment.objects.filter(organization_id=organization_id, lease_id=lease_id)
            .order_by("paid_at", "created_at", "id")
            .values("id", "amount", "paid_at", "method", "notes")
        )

        # Step 2: compute allocated totals per charge
        alloc_by_charge = {
            row["charge_id"]: (row["total"] or Decimal("0.00"))
            for row in (
                Allocation.objects.filter(
                    organization_id=organization_id,
                    charge_id__in=[c["id"] for c in charges] or [0],
                )
                .values("charge_id")
                .annotate(total=Sum("amount"))
            )
        }

        # Step 3: compute allocated totals per payment
        alloc_by_payment = {
            row["payment_id"]: (row["total"] or Decimal("0.00"))
            for row in (
                Allocation.objects.filter(
                    organization_id=organization_id,
                    payment_id__in=[p["id"] for p in payments] or [0],
                )
                .values("payment_id")
                .annotate(total=Sum("amount"))
            )
        }

        # Step 4: build charge rows
        charge_rows: List[LedgerChargeRow] = []
        total_charges = Decimal("0.00")
        total_allocated_to_charges = Decimal("0.00")

        for c in charges:
            allocated = alloc_by_charge.get(c["id"], Decimal("0.00"))
            balance = c["amount"] - allocated
            if balance < 0:
                balance = Decimal("0.00")

            total_charges += c["amount"]
            total_allocated_to_charges += allocated

            charge_rows.append(
                LedgerChargeRow(
                    id=c["id"],
                    kind=c["kind"],
                    amount=c["amount"],
                    due_date=c["due_date"].isoformat(),
                    allocated_total=allocated,
                    balance=balance,
                    notes=c["notes"] or "",
                )
            )

        # Step 5: build payment rows
        payment_rows: List[LedgerPaymentRow] = []
        total_payments = Decimal("0.00")
        total_allocated_from_payments = Decimal("0.00")

        for p in payments:
            allocated = alloc_by_payment.get(p["id"], Decimal("0.00"))
            unapplied = p["amount"] - allocated
            if unapplied < 0:
                unapplied = Decimal("0.00")

            total_payments += p["amount"]
            total_allocated_from_payments += allocated

            payment_rows.append(
                LedgerPaymentRow(
                    id=p["id"],
                    amount=p["amount"],
                    paid_at=p["paid_at"].isoformat(),
                    method=p["method"],
                    allocated_total=allocated,
                    unapplied=unapplied,
                    notes=p["notes"] or "",
                )
            )

        # Step 6: lease-level computed balance
        lease_balance = total_charges - total_allocated_to_charges
        if lease_balance < 0:
            lease_balance = Decimal("0.00")

        return {
            "lease_id": lease_id,
            "totals": {
                "charges": str(total_charges),
                "payments": str(total_payments),
                "allocated": str(total_allocated_to_charges),
                "balance": str(lease_balance),
                "unapplied_payments": str(total_payments - total_allocated_from_payments),
            },
            "charges": [row.__dict__ for row in charge_rows],
            "payments": [row.__dict__ for row in payment_rows],
        }
