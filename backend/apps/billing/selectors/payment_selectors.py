# Filename: backend/apps/billing/selectors/payment_selectors.py

"""
Payment selectors for the billing domain.

This module contains deterministic, organization-scoped read helpers for
payment-focused billing views.

Why this file exists:
- Moves payment read logic away from mutation services.
- Creates reusable read models for payment lists and future workbench views.
- Preserves the ledger-first model by deriving unapplied balances from
  payments and allocations rather than storing mutable state.

Current scope:
- list payments for a lease
- compute allocated totals per payment
- compute unapplied balance per payment
- list unapplied payments for an organization
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.db.models import Sum

from apps.billing.selectors.billing_queryset import BillingQuerysets


@dataclass(frozen=True)
class PaymentBalanceRow:
    """
    Payment read row with derived allocation totals.

    Attributes:
        id: Payment primary key.
        lease_id: Lease primary key.
        amount: Payment amount.
        paid_at: ISO-formatted payment datetime.
        method: Payment method string.
        allocated_total: Total amount allocated from this payment.
        unapplied_amount: Remaining unapplied amount on this payment.
        notes: Optional payment notes.
    """

    id: int
    lease_id: int
    amount: Decimal
    paid_at: str
    method: str
    allocated_total: Decimal
    unapplied_amount: Decimal
    notes: str


class PaymentSelectors:
    """
    Deterministic read-side selectors for payment data.

    These selectors are organization-scoped and do not mutate billing records.
    They derive payment balances strictly from:
    - payments
    - allocations
    """

    @staticmethod
    def _allocation_totals_by_payment_ids(
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
        # Step 1: short-circuit empty workloads
        if not payment_ids:
            return {}

        # Step 2: aggregate allocations by payment
        rows = (
            BillingQuerysets.get_allocation_base_queryset(
                organization_id=organization_id,
            )
            .filter(payment_id__in=payment_ids)
            .values("payment_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["payment_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @staticmethod
    def _serialize_paid_at(value: datetime | date | Any) -> str:
        """
        Serialize a payment date/datetime to a stable ISO string.

        Args:
            value: Payment datetime-like value.

        Returns:
            str: ISO-formatted date/datetime string.
        """
        # Step 1: normalize to ISO format when possible
        if hasattr(value, "isoformat"):
            return value.isoformat()

        # Step 2: fall back to string conversion
        return str(value)

    @classmethod
    def _build_payment_balance_rows(
        cls,
        *,
        organization_id: int,
        payments: list[Any],
    ) -> list[PaymentBalanceRow]:
        """
        Build payment balance rows from payment model instances.

        Args:
            organization_id: Active organization primary key.
            payments: Payment model instances.

        Returns:
            list[PaymentBalanceRow]: Payment balance rows.
        """
        # Step 1: build allocation totals by payment
        payment_ids = [payment.id for payment in payments]
        allocation_map = cls._allocation_totals_by_payment_ids(
            organization_id=organization_id,
            payment_ids=payment_ids,
        )

        rows: list[PaymentBalanceRow] = []

        # Step 2: derive allocated and unapplied amounts per payment
        for payment in payments:
            allocated_total = allocation_map.get(payment.id, Decimal("0.00"))
            unapplied_amount = payment.amount - allocated_total

            if unapplied_amount < Decimal("0.00"):
                unapplied_amount = Decimal("0.00")

            rows.append(
                PaymentBalanceRow(
                    id=payment.id,
                    lease_id=payment.lease_id,
                    amount=payment.amount,
                    paid_at=cls._serialize_paid_at(payment.paid_at),
                    method=payment.method,
                    allocated_total=allocated_total,
                    unapplied_amount=unapplied_amount,
                    notes=getattr(payment, "notes", "") or "",
                )
            )

        return rows

    @classmethod
    def list_payments_for_lease(
        cls,
        *,
        organization_id: int,
        lease_id: int,
    ) -> list[PaymentBalanceRow]:
        """
        Return payment rows for a single lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            list[PaymentBalanceRow]: Payment rows ordered by payment date.
        """
        # Step 1: fetch organization-safe payments for the lease
        payments = list(
            BillingQuerysets.get_payment_base_queryset(
                organization_id=organization_id,
            )
            .filter(lease_id=lease_id)
            .only("id", "lease_id", "amount", "paid_at", "method", "notes", "created_at")
            .order_by("paid_at", "created_at", "id")
        )

        # Step 2: derive the payment balance rows
        return cls._build_payment_balance_rows(
            organization_id=organization_id,
            payments=payments,
        )

    @classmethod
    def list_unapplied_payments_for_org(
        cls,
        *,
        organization_id: int,
    ) -> list[PaymentBalanceRow]:
        """
        Return payment rows with unapplied balances for the organization.

        Args:
            organization_id: Active organization primary key.

        Returns:
            list[PaymentBalanceRow]: Payment rows with unapplied balances.
        """
        # Step 1: fetch all organization-scoped payments
        payments = list(
            BillingQuerysets.get_payment_base_queryset(
                organization_id=organization_id,
            )
            .only("id", "lease_id", "amount", "paid_at", "method", "notes", "created_at")
            .order_by("paid_at", "created_at", "id")
        )

        # Step 2: build full payment balance rows
        rows = cls._build_payment_balance_rows(
            organization_id=organization_id,
            payments=payments,
        )

        # Step 3: keep only rows with unapplied balances
        return [
            row
            for row in rows
            if row.unapplied_amount > Decimal("0.00")
        ]

    @classmethod
    def get_payment_unapplied_balances(
        cls,
        *,
        organization_id: int,
        payment_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return unapplied balances keyed by payment ID.

        Args:
            organization_id: Active organization primary key.
            payment_ids: Payment IDs to resolve.

        Returns:
            dict[int, Decimal]: Unapplied amounts keyed by payment ID.
        """
        # Step 1: short-circuit empty workloads
        if not payment_ids:
            return {}

        # Step 2: fetch the requested payments in the org boundary
        payments = list(
            BillingQuerysets.get_payment_base_queryset(
                organization_id=organization_id,
            )
            .filter(id__in=payment_ids)
            .only("id", "lease_id", "amount", "paid_at", "method", "notes", "created_at")
        )

        # Step 3: derive full payment rows and re-key by payment ID
        rows = cls._build_payment_balance_rows(
            organization_id=organization_id,
            payments=payments,
        )

        return {
            row.id: row.unapplied_amount
            for row in rows
        }