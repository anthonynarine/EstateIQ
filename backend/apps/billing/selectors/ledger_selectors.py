# Filename: backend/apps/billing/selectors/ledger_selectors.py

"""
Lease-ledger selectors for the billing domain.

This module contains deterministic, organization-scoped read helpers for
assembling lease-ledger data.

Why this file exists:
- Moves query-heavy ledger assembly out of the service layer.
- Creates a dedicated read-model boundary for lease-ledger data.
- Preserves the current public ledger contract while preparing the billing
  domain for a fuller selector-based architecture.

Refactor note:
This selector intentionally preserves the current runtime payload shape used by
the existing lease ledger endpoint:
- lease_id
- totals
- charges
- payments

It does not yet add richer lease metadata such as tenant names, unit labels,
building names, or explicit allocation rows. Those can be added deliberately in
a later contract pass once the selector boundary is in place.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.db.models import Sum

from apps.billing.models import Allocation, Charge, Payment


@dataclass(frozen=True)
class LedgerChargeRow:
    """
    Charge row for the lease ledger read model.

    Attributes:
        id: Charge primary key.
        kind: Charge kind string.
        amount: Charge amount.
        due_date: ISO-formatted due date.
        allocated_total: Total allocations applied to the charge.
        balance: Remaining unpaid balance on the charge.
        notes: Optional charge notes.
    """

    id: int
    kind: str
    amount: Decimal
    due_date: str
    allocated_total: Decimal
    balance: Decimal
    notes: str


@dataclass(frozen=True)
class LedgerPaymentRow:
    """
    Payment row for the lease ledger read model.

    Attributes:
        id: Payment primary key.
        amount: Payment amount.
        paid_at: ISO-formatted payment datetime.
        method: Payment method string.
        allocated_total: Total allocations created from the payment.
        unapplied: Remaining unapplied payment amount.
        notes: Optional payment notes.
    """

    id: int
    amount: Decimal
    paid_at: str
    method: str
    allocated_total: Decimal
    unapplied: Decimal
    notes: str


class LeaseLedgerSelectors:
    """
    Deterministic read-side selectors for lease-ledger data.

    These selectors are organization-scoped and do not mutate billing records.
    They are responsible for assembling the lease-level ledger payload from the
    ledger source of truth:
    - charges
    - payments
    - allocations
    """

    @staticmethod
    def _charge_rows(
        *,
        organization_id: int,
        lease_id: int,
    ) -> list[dict[str, Any]]:
        """
        Return raw charge rows for the target lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            list[dict[str, Any]]: Raw charge row dicts.
        """
        # Step 1: fetch organization-safe charge rows in stable display order
        return list(
            Charge.objects.filter(
                organization_id=organization_id,
                lease_id=lease_id,
            )
            .order_by("due_date", "created_at", "id")
            .values("id", "kind", "amount", "due_date", "notes")
        )

    @staticmethod
    def _payment_rows(
        *,
        organization_id: int,
        lease_id: int,
    ) -> list[dict[str, Any]]:
        """
        Return raw payment rows for the target lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            list[dict[str, Any]]: Raw payment row dicts.
        """
        # Step 1: fetch organization-safe payment rows in stable display order
        return list(
            Payment.objects.filter(
                organization_id=organization_id,
                lease_id=lease_id,
            )
            .order_by("paid_at", "created_at", "id")
            .values("id", "amount", "paid_at", "method", "notes")
        )

    @staticmethod
    def _allocations_by_charge(
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
        # Step 1: short-circuit empty charge sets
        if not charge_ids:
            return {}

        # Step 2: aggregate allocation totals by charge
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
    def _allocations_by_payment(
        *,
        organization_id: int,
        payment_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return allocation totals keyed by payment ID.

        Args:
            organization_id: Active organization primary key.
            payment_ids: Payment IDs to aggregate.

        Returns:
            dict[int, Decimal]: Allocation totals keyed by payment ID.
        """
        # Step 1: short-circuit empty payment sets
        if not payment_ids:
            return {}

        # Step 2: aggregate allocation totals by payment
        rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                payment_id__in=payment_ids,
            )
            .values("payment_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["payment_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @classmethod
    def build_lease_ledger(
        cls,
        *,
        organization_id: int,
        lease_id: int,
    ) -> dict[str, Any]:
        """
        Build the current lease-ledger read model.

        Current preserved contract:
        - lease_id
        - totals
        - charges
        - payments

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            dict[str, Any]: Serializer-ready lease-ledger payload.
        """
        # Step 1: fetch base charge/payment rows
        charges = cls._charge_rows(
            organization_id=organization_id,
            lease_id=lease_id,
        )
        payments = cls._payment_rows(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        # Step 2: build allocation lookup maps
        alloc_by_charge = cls._allocations_by_charge(
            organization_id=organization_id,
            charge_ids=[charge["id"] for charge in charges],
        )
        alloc_by_payment = cls._allocations_by_payment(
            organization_id=organization_id,
            payment_ids=[payment["id"] for payment in payments],
        )

        # Step 3: build charge rows and charge-side totals
        charge_rows: list[dict[str, Any]] = []
        total_charges = Decimal("0.00")
        total_allocated_to_charges = Decimal("0.00")

        for charge in charges:
            allocated_total = alloc_by_charge.get(charge["id"], Decimal("0.00"))
            remaining_balance = charge["amount"] - allocated_total

            if remaining_balance < Decimal("0.00"):
                remaining_balance = Decimal("0.00")

            total_charges += charge["amount"]
            total_allocated_to_charges += allocated_total

            charge_rows.append(
                LedgerChargeRow(
                    id=charge["id"],
                    kind=charge["kind"],
                    amount=charge["amount"],
                    due_date=charge["due_date"].isoformat(),
                    allocated_total=allocated_total,
                    balance=remaining_balance,
                    notes=charge["notes"] or "",
                ).__dict__
            )

        # Step 4: build payment rows and payment-side totals
        payment_rows: list[dict[str, Any]] = []
        total_payments = Decimal("0.00")
        total_allocated_from_payments = Decimal("0.00")

        for payment in payments:
            allocated_total = alloc_by_payment.get(payment["id"], Decimal("0.00"))
            unapplied_amount = payment["amount"] - allocated_total

            if unapplied_amount < Decimal("0.00"):
                unapplied_amount = Decimal("0.00")

            total_payments += payment["amount"]
            total_allocated_from_payments += allocated_total

            payment_rows.append(
                LedgerPaymentRow(
                    id=payment["id"],
                    amount=payment["amount"],
                    paid_at=payment["paid_at"].isoformat(),
                    method=payment["method"],
                    allocated_total=allocated_total,
                    unapplied=unapplied_amount,
                    notes=payment["notes"] or "",
                ).__dict__
            )

        # Step 5: compute preserved lease-level totals
        lease_balance = total_charges - total_allocated_to_charges
        if lease_balance < Decimal("0.00"):
            lease_balance = Decimal("0.00")

        unapplied_payments = total_payments - total_allocated_from_payments
        if unapplied_payments < Decimal("0.00"):
            unapplied_payments = Decimal("0.00")

        # Step 6: return the current serializer-ready payload
        return {
            "lease_id": lease_id,
            "totals": {
                "charges": str(total_charges),
                "payments": str(total_payments),
                "allocated": str(total_allocated_to_charges),
                "balance": str(lease_balance),
                "unapplied_payments": str(unapplied_payments),
            },
            "charges": charge_rows,
            "payments": payment_rows,
        }