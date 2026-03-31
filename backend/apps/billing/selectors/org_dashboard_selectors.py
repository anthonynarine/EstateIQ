# Filename: backend/apps/billing/selectors/org_dashboard_selectors.py

"""
Organization dashboard selectors for the billing domain.

This module contains read-side query helpers used to compute organization-level
billing dashboard metrics.

Why this file exists:
- Moves query-heavy reporting logic out of the service layer.
- Keeps dashboard KPI computation deterministic and organization-scoped.
- Creates a clean path toward a larger selector-based read architecture.

Design note:
These selectors intentionally preserve the current dashboard behavior so the
public API contract does not change during the refactor. In particular,
`collected_this_month` currently means allocations applied to rent charges due
in the target month, not strictly payments received in the month.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db.models import Sum

from apps.billing.models import Allocation, Charge, ChargeKind, Payment


@dataclass(frozen=True)
class OutstandingSnapshot:
    """
    Computed outstanding-balance snapshot for an organization.

    Attributes:
        outstanding_as_of: Total remaining unpaid balance for charges due on or
            before the as-of date.
        delinquent_leases_count: Number of distinct leases with remaining
            unpaid balances as of the as-of date.
    """

    outstanding_as_of: Decimal
    delinquent_leases_count: int


class OrgDashboardSelectors:
    """
    Read-side selectors for organization dashboard metrics.

    These selectors are organization-scoped and deterministic. They do not own
    response shaping for the API layer and they do not mutate billing data.
    """

    @staticmethod
    def month_range(as_of: date) -> tuple[date, date]:
        """
        Return the first day of the report month and the next month boundary.

        Args:
            as_of: Report date.

        Returns:
            tuple[date, date]: Inclusive month start and exclusive next-month
            start.
        """
        # Step 1: derive the first day of the report month
        month_start = date(as_of.year, as_of.month, 1)

        # Step 2: derive the exclusive next-month boundary
        if as_of.month == 12:
            next_month_start = date(as_of.year + 1, 1, 1)
        else:
            next_month_start = date(as_of.year, as_of.month + 1, 1)

        return month_start, next_month_start

    @staticmethod
    def _sum_amount(queryset) -> Decimal:
        """
        Aggregate and normalize a sum over the `amount` field.

        Args:
            queryset: Django queryset prepared for aggregation.

        Returns:
            Decimal: Aggregate total, defaulting to 0.00 when null.
        """
        # Step 1: execute the aggregate and normalize null totals
        return queryset.aggregate(total=Sum("amount")).get("total") or Decimal("0.00")

    @classmethod
    def expected_rent_this_month(
        cls,
        *,
        organization_id: int,
        month_start: date,
        next_month_start: date,
    ) -> Decimal:
        """
        Return expected rent for the target month.

        Current rule:
        Sum all rent charges whose due dates fall within the month interval.

        Args:
            organization_id: Active organization primary key.
            month_start: Inclusive month start.
            next_month_start: Exclusive next-month start.

        Returns:
            Decimal: Expected rent total for the month.
        """
        # Step 1: aggregate month-due rent charges
        return cls._sum_amount(
            Charge.objects.filter(
                organization_id=organization_id,
                kind=ChargeKind.RENT,
                due_date__gte=month_start,
                due_date__lt=next_month_start,
            )
        )

    @classmethod
    def collected_this_month_preserved_behavior(
        cls,
        *,
        organization_id: int,
        month_start: date,
        next_month_start: date,
    ) -> Decimal:
        """
        Return the current preserved `collected_this_month` metric.

        Preserved behavior:
        Sum allocations applied to rent charges whose due dates fall within the
        target month.

        Important:
        This is intentionally not "payments received during the month." We are
        preserving existing runtime behavior until a later contract decision is
        made.

        Args:
            organization_id: Active organization primary key.
            month_start: Inclusive month start.
            next_month_start: Exclusive next-month start.

        Returns:
            Decimal: Allocation total currently exposed as month collection.
        """
        # Step 1: aggregate allocations applied to month-due rent charges
        return cls._sum_amount(
            Allocation.objects.filter(
                organization_id=organization_id,
                charge__organization_id=organization_id,
                charge__kind=ChargeKind.RENT,
                charge__due_date__gte=month_start,
                charge__due_date__lt=next_month_start,
            )
        )

    @staticmethod
    def _allocation_totals_by_charge(
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

    @classmethod
    def outstanding_snapshot(
        cls,
        *,
        organization_id: int,
        as_of: date,
    ) -> OutstandingSnapshot:
        """
        Return the outstanding balance snapshot as of the provided date.

        Rule:
        - include charges due on or before `as_of`
        - subtract allocations applied to those charges
        - count distinct leases with remaining positive balances

        Args:
            organization_id: Active organization primary key.
            as_of: Report date.

        Returns:
            OutstandingSnapshot: Outstanding total and delinquent lease count.
        """
        # Step 1: fetch organization-scoped charges due by the report date
        charges_due = list(
            Charge.objects.filter(
                organization_id=organization_id,
                due_date__lte=as_of,
            ).values("id", "lease_id", "amount")
        )

        # Step 2: short-circuit empty result sets
        if not charges_due:
            return OutstandingSnapshot(
                outstanding_as_of=Decimal("0.00"),
                delinquent_leases_count=0,
            )

        # Step 3: build allocation totals by charge
        charge_ids = [charge["id"] for charge in charges_due]
        allocation_map = cls._allocation_totals_by_charge(
            organization_id=organization_id,
            charge_ids=charge_ids,
        )

        # Step 4: derive remaining balances and delinquent lease count
        outstanding_total = Decimal("0.00")
        delinquent_lease_ids: set[int] = set()

        for charge in charges_due:
            allocated_total = allocation_map.get(charge["id"], Decimal("0.00"))
            remaining_balance = charge["amount"] - allocated_total

            if remaining_balance > 0:
                outstanding_total += remaining_balance
                delinquent_lease_ids.add(charge["lease_id"])

        return OutstandingSnapshot(
            outstanding_as_of=outstanding_total,
            delinquent_leases_count=len(delinquent_lease_ids),
        )

    @classmethod
    def unapplied_credits_total(
        cls,
        *,
        organization_id: int,
    ) -> Decimal:
        """
        Return total unapplied payment credits for the organization.

        Rule:
        `unapplied_credits_total = sum(payments) - sum(allocations)`

        The value is floored at zero to avoid exposing negative amounts if bad
        historical data exists.

        Args:
            organization_id: Active organization primary key.

        Returns:
            Decimal: Total unapplied payment credits.
        """
        # Step 1: aggregate total payments
        total_payments = cls._sum_amount(
            Payment.objects.filter(organization_id=organization_id)
        )

        # Step 2: aggregate total allocations
        allocated_total = cls._sum_amount(
            Allocation.objects.filter(organization_id=organization_id)
        )

        # Step 3: derive and floor the remaining unapplied credits
        unapplied_total = total_payments - allocated_total
        if unapplied_total < Decimal("0.00"):
            return Decimal("0.00")

        return unapplied_total