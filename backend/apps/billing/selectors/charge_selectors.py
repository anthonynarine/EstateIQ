# Filename: backend/apps/billing/selectors/charge_selectors.py

"""
Charge selectors for the billing domain.

This module contains deterministic, organization-scoped read helpers for
charge-focused billing views.

Why this file exists:
- Moves charge read logic away from write services and view code.
- Creates reusable read models for charge lists and unpaid-charge workflows.
- Preserves the ledger-first model by deriving remaining balances from charges
  and allocations rather than storing mutable paid/unpaid state.

Current scope:
- list charges for a lease
- compute allocated totals per charge
- compute remaining balance per charge
- list unpaid charges for an organization or a specific lease
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Sum

from apps.billing.selectors.billing_queryset import BillingQuerysets


@dataclass(frozen=True)
class ChargeBalanceRow:
    """
    Charge read row with derived allocation totals.

    Attributes:
        id: Charge primary key.
        lease_id: Lease primary key.
        kind: Charge kind string.
        amount: Charge amount.
        due_date: ISO-formatted due date.
        allocated_total: Total amount allocated to this charge.
        remaining_balance: Remaining unpaid balance on this charge.
        is_overdue: Whether the charge is overdue relative to the provided date.
        notes: Optional charge notes.
    """

    id: int
    lease_id: int
    kind: str
    amount: Decimal
    due_date: str
    allocated_total: Decimal
    remaining_balance: Decimal
    is_overdue: bool
    notes: str


class ChargeSelectors:
    """
    Deterministic read-side selectors for charge data.

    These selectors are organization-scoped and do not mutate billing records.
    They derive charge balances strictly from:
    - charges
    - allocations
    """

    @staticmethod
    def _allocation_totals_by_charge_ids(
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
            BillingQuerysets.get_allocation_base_queryset(
                organization_id=organization_id,
            )
            .filter(charge_id__in=charge_ids)
            .values("charge_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["charge_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @classmethod
    def _build_charge_balance_rows(
        cls,
        *,
        organization_id: int,
        charges: list[Any],
        as_of: date | None = None,
    ) -> list[ChargeBalanceRow]:
        """
        Build charge balance rows from charge model instances.

        Args:
            organization_id: Active organization primary key.
            charges: Charge model instances.
            as_of: Optional date used to determine overdue status.

        Returns:
            list[ChargeBalanceRow]: Charge balance rows.
        """
        # Step 1: build allocation totals by charge
        charge_ids = [charge.id for charge in charges]
        allocation_map = cls._allocation_totals_by_charge_ids(
            organization_id=organization_id,
            charge_ids=charge_ids,
        )

        rows: list[ChargeBalanceRow] = []

        # Step 2: derive allocated and remaining amounts per charge
        for charge in charges:
            allocated_total = allocation_map.get(charge.id, Decimal("0.00"))
            remaining_balance = charge.amount - allocated_total

            if remaining_balance < Decimal("0.00"):
                remaining_balance = Decimal("0.00")

            is_overdue = False
            if as_of is not None and remaining_balance > Decimal("0.00"):
                is_overdue = charge.due_date < as_of

            rows.append(
                ChargeBalanceRow(
                    id=charge.id,
                    lease_id=charge.lease_id,
                    kind=charge.kind,
                    amount=charge.amount,
                    due_date=charge.due_date.isoformat(),
                    allocated_total=allocated_total,
                    remaining_balance=remaining_balance,
                    is_overdue=is_overdue,
                    notes=getattr(charge, "notes", "") or "",
                )
            )

        return rows

    @classmethod
    def list_charges_for_lease(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        as_of: date | None = None,
    ) -> list[ChargeBalanceRow]:
        """
        Return charge rows for a single lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.
            as_of: Optional date used to determine overdue status.

        Returns:
            list[ChargeBalanceRow]: Charge rows ordered by due date.
        """
        # Step 1: fetch organization-safe charges for the lease
        charges = list(
            BillingQuerysets.get_charge_base_queryset(
                organization_id=organization_id,
            )
            .filter(lease_id=lease_id)
            .only("id", "lease_id", "kind", "amount", "due_date", "notes", "created_at")
            .order_by("due_date", "created_at", "id")
        )

        # Step 2: derive the charge balance rows
        return cls._build_charge_balance_rows(
            organization_id=organization_id,
            charges=charges,
            as_of=as_of,
        )

    @classmethod
    def list_unpaid_charges(
        cls,
        *,
        organization_id: int,
        lease_id: int | None = None,
        as_of: date | None = None,
    ) -> list[ChargeBalanceRow]:
        """
        Return unpaid charge rows for an organization or a single lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Optional lease primary key filter.
            as_of: Optional date used to determine overdue status and to filter
                charges due on or before that date.

        Returns:
            list[ChargeBalanceRow]: Unpaid charge rows.
        """
        # Step 1: start from the org-safe base queryset
        queryset = BillingQuerysets.get_charge_base_queryset(
            organization_id=organization_id,
        )

        # Step 2: apply optional lease filter
        if lease_id is not None:
            queryset = queryset.filter(lease_id=lease_id)

        # Step 3: apply optional due-date cutoff
        if as_of is not None:
            queryset = queryset.filter(due_date__lte=as_of)

        # Step 4: fetch stable-ordered charge instances
        charges = list(
            queryset.only("id", "lease_id", "kind", "amount", "due_date", "notes", "created_at")
            .order_by("due_date", "created_at", "id")
        )

        # Step 5: build full charge balance rows
        rows = cls._build_charge_balance_rows(
            organization_id=organization_id,
            charges=charges,
            as_of=as_of,
        )

        # Step 6: keep only charges with remaining balances
        return [
            row
            for row in rows
            if row.remaining_balance > Decimal("0.00")
        ]

    @classmethod
    def get_charge_remaining_balances(
        cls,
        *,
        organization_id: int,
        charge_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return remaining balances keyed by charge ID.

        Args:
            organization_id: Active organization primary key.
            charge_ids: Charge IDs to resolve.

        Returns:
            dict[int, Decimal]: Remaining balances keyed by charge ID.
        """
        # Step 1: short-circuit empty workloads
        if not charge_ids:
            return {}

        # Step 2: fetch the requested charges in the org boundary
        charges = list(
            BillingQuerysets.get_charge_base_queryset(
                organization_id=organization_id,
            )
            .filter(id__in=charge_ids)
            .only("id", "lease_id", "kind", "amount", "due_date", "notes", "created_at")
        )

        # Step 3: derive full charge rows and re-key by charge ID
        rows = cls._build_charge_balance_rows(
            organization_id=organization_id,
            charges=charges,
        )

        return {
            row.id: row.remaining_balance
            for row in rows
        }