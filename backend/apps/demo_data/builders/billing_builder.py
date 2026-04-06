# Filename: backend/apps/demo_data/builders/billing_builder.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.billing.models import Payment
from apps.billing.services.payment_write_service import PaymentWriteService
from apps.billing.services.rent_charge_service import RentChargeService
from apps.demo_data.constants import DEMO_AS_OF_DATE
from apps.demo_data.scenarios import DEMO_BILLING_SCENARIOS
from apps.leases.models import Lease


@dataclass(frozen=True)
class DemoBillingBuildResult:
    """Structured result for seeded billing history."""

    charges_created: int
    charges_existing: int
    payments_created: int
    payments_existing: int


class DemoBillingBuilder:
    """Create deterministic billing history for seeded demo leases."""

    @classmethod
    @transaction.atomic
    def build(
        cls,
        *,
        organization_id: int,
        lease_ids_by_code: dict[str, int],
        created_by_id: int | None = None,
        as_of: date = DEMO_AS_OF_DATE,
    ) -> DemoBillingBuildResult:
        """Create or reconcile billing history for configured demo leases.

        Args:
            organization_id: Target organization primary key.
            lease_ids_by_code: Stable lease code -> lease id lookup.
            created_by_id: Optional actor user primary key.
            as_of: Anchor date for historical generation.

        Returns:
            DemoBillingBuildResult: Summary counts for this seed pass.
        """
        # Step 1: initialize summary counters
        charges_created = 0
        charges_existing = 0
        payments_created = 0
        payments_existing = 0

        # Step 2: process lease billing scenarios deterministically
        for lease_code in sorted(DEMO_BILLING_SCENARIOS.keys()):
            scenario = DEMO_BILLING_SCENARIOS[lease_code]
            lease_id = lease_ids_by_code[lease_code]

            lease = Lease.objects.get(
                id=lease_id,
                organization_id=organization_id,
            )

            lease_result = cls._build_lease_billing_history(
                lease_code=lease_code,
                lease=lease,
                scenario=scenario,
                organization_id=organization_id,
                created_by_id=created_by_id,
                as_of=as_of,
            )

            charges_created += lease_result["charges_created"]
            charges_existing += lease_result["charges_existing"]
            payments_created += lease_result["payments_created"]
            payments_existing += lease_result["payments_existing"]

        return DemoBillingBuildResult(
            charges_created=charges_created,
            charges_existing=charges_existing,
            payments_created=payments_created,
            payments_existing=payments_existing,
        )

    @classmethod
    def _build_lease_billing_history(
        cls,
        *,
        lease_code: str,
        lease: Lease,
        scenario: dict[str, Any],
        organization_id: int,
        created_by_id: int | None,
        as_of: date,
    ) -> dict[str, int]:
        """Create or reconcile monthly charge/payment history for one lease.

        Args:
            lease_code: Stable lease scenario code.
            lease: Lease instance.
            scenario: Billing behavior scenario for the lease.
            organization_id: Target organization primary key.
            created_by_id: Optional actor user primary key.
            as_of: Anchor date for historical generation.

        Returns:
            dict[str, int]: Summary counters for this lease history.
        """
        # Step 1: initialize per-lease counters
        charges_created = 0
        charges_existing = 0
        payments_created = 0
        payments_existing = 0

        # Step 2: generate month history for the lease
        for month_start in cls._iter_month_starts_for_lease(
            lease=lease,
            as_of=as_of,
        ):
            month_key = month_start.strftime("%Y-%m")

            # Step 3: generate the rent charge for this month
            charge_result = RentChargeService.generate_monthly_rent_charge(
                lease_id=lease.id,
                year=month_start.year,
                month=month_start.month,
                created_by_id=created_by_id,
            )

            if charge_result.created:
                charges_created += 1
            else:
                charges_existing += 1

            # Step 4: build the primary payment behavior for this month
            payment_result = cls._seed_primary_payment_for_month(
                organization_id=organization_id,
                lease_code=lease_code,
                lease=lease,
                scenario=scenario,
                month_key=month_key,
                charge_id=charge_result.charge_id,
                due_date=charge_result.due_date,
                created_by_id=created_by_id,
            )

            payments_created += payment_result["payments_created"]
            payments_existing += payment_result["payments_existing"]

            # Step 5: optionally create extra unapplied payment activity
            extra_payment_result = cls._seed_extra_unapplied_payment_for_month(
                organization_id=organization_id,
                lease_code=lease_code,
                lease=lease,
                scenario=scenario,
                month_key=month_key,
                due_date=charge_result.due_date,
                created_by_id=created_by_id,
            )

            payments_created += extra_payment_result["payments_created"]
            payments_existing += extra_payment_result["payments_existing"]

        return {
            "charges_created": charges_created,
            "charges_existing": charges_existing,
            "payments_created": payments_created,
            "payments_existing": payments_existing,
        }

    @staticmethod
    def _first_day_of_month(target_date: date) -> date:
        """Return the first day of the month for the provided date."""
        # Step 1: normalize to the first of the month
        return date(target_date.year, target_date.month, 1)

    @staticmethod
    def _first_day_of_next_month(target_date: date) -> date:
        """Return the first day of the next month."""
        # Step 1: roll over year boundary safely
        if target_date.month == 12:
            return date(target_date.year + 1, 1, 1)

        # Step 2: standard next-month increment
        return date(target_date.year, target_date.month + 1, 1)

    @classmethod
    def _iter_month_starts_for_lease(
        cls,
        *,
        lease: Lease,
        as_of: date,
    ) -> list[date]:
        """Return billable month starts for a lease up to the as-of month.

        Args:
            lease: Lease instance.
            as_of: Anchor date for historical generation.

        Returns:
            list[date]: First day of each billable month.
        """
        # Step 1: derive the iteration start month
        current_month = cls._first_day_of_month(lease.start_date)

        # Step 2: derive the exclusive upper bound
        as_of_exclusive = cls._first_day_of_next_month(
            cls._first_day_of_month(as_of)
        )

        if lease.end_date is None:
            end_exclusive = as_of_exclusive
        else:
            end_exclusive = min(lease.end_date, as_of_exclusive)

        months: list[date] = []

        # Step 3: walk month-by-month under end-exclusive semantics
        while current_month < end_exclusive:
            months.append(current_month)
            current_month = cls._first_day_of_next_month(current_month)

        return months

    @staticmethod
    def _decimal_from_string(raw_value: str) -> Decimal:
        """Convert a scenario amount string into Decimal."""
        # Step 1: normalize to Decimal
        return Decimal(raw_value)

    @staticmethod
    def _build_month_key(target_date: date) -> str:
        """Return a YYYY-MM key for scenario matching."""
        # Step 1: format stable month key
        return target_date.strftime("%Y-%m")

    @classmethod
    def _resolve_payment_date(
        cls,
        *,
        due_date: date,
        month_key: str,
        scenario: dict[str, Any],
    ) -> date:
        """Resolve the payment date for a month based on scenario flags.

        Args:
            due_date: Charge due date for the month.
            month_key: Current YYYY-MM month key.
            scenario: Lease billing behavior scenario.

        Returns:
            date: Deterministic payment date.
        """
        early_months = set(scenario.get("early_months", []))
        late_months = set(scenario.get("late_months", []))

        # Step 1: early payments land slightly before due date
        if month_key in early_months:
            return due_date - timedelta(days=2)

        # Step 2: late payments land after due date
        if month_key in late_months:
            return due_date + timedelta(days=5)

        # Step 3: standard on-time payment
        return due_date

    @staticmethod
    def _to_payment_datetime(payment_date: date) -> datetime:
        """Convert a payment date into a timezone-aware midday datetime.

        Args:
            payment_date: Payment calendar date.

        Returns:
            datetime: Timezone-aware datetime for payment persistence.
        """
        # Step 1: create a stable midday naive datetime
        naive_dt = datetime.combine(payment_date, time(hour=12, minute=0))

        # Step 2: convert to aware datetime if needed
        if timezone.is_naive(naive_dt):
            return timezone.make_aware(naive_dt)

        return naive_dt

    @staticmethod
    def _build_primary_payment_external_ref(
        *,
        lease_code: str,
        month_key: str,
    ) -> str:
        """Build a deterministic external reference for the primary payment."""
        # Step 1: compose stable payment identity
        return f"DEMO:{lease_code}:{month_key}:PRIMARY"

    @staticmethod
    def _build_unapplied_payment_external_ref(
        *,
        lease_code: str,
        month_key: str,
    ) -> str:
        """Build a deterministic external reference for extra unapplied cash."""
        # Step 1: compose stable extra payment identity
        return f"DEMO:{lease_code}:{month_key}:UNAPPLIED"

    @staticmethod
    def _payment_exists(
        *,
        lease_id: int,
        external_ref: str,
    ) -> bool:
        """Return whether a deterministic payment already exists.

        Args:
            lease_id: Lease primary key.
            external_ref: Deterministic payment external reference.

        Returns:
            bool: True if the payment already exists.
        """
        # Step 1: query by stable lease + external ref
        return Payment.objects.filter(
            lease_id=lease_id,
            external_ref=external_ref,
        ).exists()

    @classmethod
    def _seed_primary_payment_for_month(
        cls,
        *,
        organization_id: int,
        lease_code: str,
        lease: Lease,
        scenario: dict[str, Any],
        month_key: str,
        charge_id: int,
        due_date: date,
        created_by_id: int | None,
    ) -> dict[str, int]:
        """Create or reconcile the primary payment for one lease-month.

        Args:
            organization_id: Target organization primary key.
            lease_code: Stable lease scenario code.
            lease: Lease instance.
            scenario: Billing behavior scenario.
            month_key: Current YYYY-MM month key.
            charge_id: Generated rent charge primary key for this month.
            due_date: Charge due date for this month.
            created_by_id: Optional actor user primary key.

        Returns:
            dict[str, int]: Created/existing payment counts for this month.
        """
        behavior = scenario["behavior"]
        skip_months = set(scenario.get("skip_months", []))
        partial_months = scenario.get("partial_months", {})

        # Step 1: if this month should be skipped, leave the charge unpaid
        if month_key in skip_months:
            return {
                "payments_created": 0,
                "payments_existing": 0,
            }

        # Step 2: resolve the intended payment amount
        if month_key in partial_months:
            payment_amount = cls._decimal_from_string(partial_months[month_key])
        else:
            payment_amount = lease.rent_amount

        # Step 3: skip invalid zero-value cases defensively
        if payment_amount <= Decimal("0.00"):
            return {
                "payments_created": 0,
                "payments_existing": 0,
            }

        # Step 4: build deterministic payment identity
        external_ref = cls._build_primary_payment_external_ref(
            lease_code=lease_code,
            month_key=month_key,
        )

        if cls._payment_exists(
            lease_id=lease.id,
            external_ref=external_ref,
        ):
            return {
                "payments_created": 0,
                "payments_existing": 1,
            }

        payment_date = cls._resolve_payment_date(
            due_date=due_date,
            month_key=month_key,
            scenario=scenario,
        )

        paid_at = cls._to_payment_datetime(payment_date)

        # Step 5: use manual allocation for clean/current scenarios
        if behavior in {
            "current",
            "late_full",
            "historical_closed",
            "partial_current",
        }:
            PaymentWriteService.record_payment(
                organization_id=organization_id,
                lease_id=lease.id,
                amount=payment_amount,
                paid_at=paid_at,
                method=scenario["payment_method"],
                external_ref=external_ref,
                notes=f"Demo seed primary payment for {lease_code} {month_key}",
                allocation_mode="manual",
                allocations=[
                    {
                        "charge_id": charge_id,
                        "amount": str(payment_amount),
                    }
                ],
                created_by_id=created_by_id,
            )
        else:
            # Step 6: delinquent flows use FIFO auto-allocation to create more
            # realistic carry-forward behavior.
            PaymentWriteService.record_payment(
                organization_id=organization_id,
                lease_id=lease.id,
                amount=payment_amount,
                paid_at=paid_at,
                method=scenario["payment_method"],
                external_ref=external_ref,
                notes=f"Demo seed primary payment for {lease_code} {month_key}",
                allocation_mode="auto",
                allocations=[],
                created_by_id=created_by_id,
            )

        return {
            "payments_created": 1,
            "payments_existing": 0,
        }

    @classmethod
    def _seed_extra_unapplied_payment_for_month(
        cls,
        *,
        organization_id: int,
        lease_code: str,
        lease: Lease,
        scenario: dict[str, Any],
        month_key: str,
        due_date: date,
        created_by_id: int | None,
    ) -> dict[str, int]:
        """Create or reconcile optional extra unapplied payment activity.

        Args:
            organization_id: Target organization primary key.
            lease_code: Stable lease scenario code.
            lease: Lease instance.
            scenario: Billing behavior scenario.
            month_key: Current YYYY-MM month key.
            due_date: Charge due date for this month.
            created_by_id: Optional actor user primary key.

        Returns:
            dict[str, int]: Created/existing payment counts for extra payments.
        """
        unapplied_payment_months = scenario.get("unapplied_payment_months", {})

        # Step 1: only create extra payment activity for configured months
        if month_key not in unapplied_payment_months:
            return {
                "payments_created": 0,
                "payments_existing": 0,
            }

        amount = cls._decimal_from_string(unapplied_payment_months[month_key])
        if amount <= Decimal("0.00"):
            return {
                "payments_created": 0,
                "payments_existing": 0,
            }

        external_ref = cls._build_unapplied_payment_external_ref(
            lease_code=lease_code,
            month_key=month_key,
        )

        if cls._payment_exists(
            lease_id=lease.id,
            external_ref=external_ref,
        ):
            return {
                "payments_created": 0,
                "payments_existing": 1,
            }

        # Step 2: extra unapplied cash lands a few days after the main payment
        payment_date = due_date + timedelta(days=7)
        paid_at = cls._to_payment_datetime(payment_date)

        PaymentWriteService.record_payment(
            organization_id=organization_id,
            lease_id=lease.id,
            amount=amount,
            paid_at=paid_at,
            method=scenario["payment_method"],
            external_ref=external_ref,
            notes=f"Demo seed extra unapplied payment for {lease_code} {month_key}",
            allocation_mode="auto",
            allocations=[],
            created_by_id=created_by_id,
        )

        return {
            "payments_created": 1,
            "payments_existing": 0,
        }
