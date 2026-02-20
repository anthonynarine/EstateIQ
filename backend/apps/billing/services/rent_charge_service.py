# Filename: apps/billing/services/rent_charge_service.py

"""
Rent charge generation service.

Creates deterministic monthly RENT charges for a lease.
Idempotent per (organization, lease, kind, due_date).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.billing.models import Charge, ChargeKind
from apps.leases.models import Lease


@dataclass(frozen=True)
class GenerateMonthResult:
    """Result from generating a rent charge for a lease and month."""
    lease_id: int
    due_date: date
    created: bool
    charge_id: int


class RentChargeService:
    """Service layer for creating monthly rent charges from leases."""

    @staticmethod
    def _month_start(year: int, month: int) -> date:
        # Step 1: normalize to first day of month
        return date(year, month, 1)

    @staticmethod
    def _get_due_day(lease: Lease) -> int:
        """
        Return the due-day-of-month using whichever field exists.

        Priority:
            1) due_day
            2) rent_due_day
            3) due_day_of_month

        Defaults to 1 if none exist.
        """
        # Step 1: try common due-day field names
        for attr in ("due_day", "rent_due_day", "due_day_of_month"):
            if hasattr(lease, attr):
                value = getattr(lease, attr)
                if value:
                    return int(value)
        return 1

    @staticmethod
    def _lease_due_date_for_month(lease: Lease, year: int, month: int) -> date:
        """
        Compute due date for lease in a given month.

        Rule:
            Clamp due_day to last day of month if the month is shorter.
        """
        # Step 1: compute last day of month
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)

        last_day = (next_month - date.resolution).day
        due_day = min(int(RentChargeService._get_due_day(lease)), int(last_day))
        return date(year, month, due_day)

    @staticmethod
    def _get_rent_amount(lease: Lease) -> Decimal:
        """
        Return the rent amount using whichever field exists.

        Priority:
            1) rent_amount
            2) monthly_rent
            3) rent
            4) rent_monthly
            5) rent_price

        Raises ValidationError if none exist.
        """
        # Step 1: try common rent field names
        for attr in ("rent_amount", "monthly_rent", "rent", "rent_monthly", "rent_price"):
            if hasattr(lease, attr):
                value = getattr(lease, attr)
                if value is not None:
                    return Decimal(value)
        raise ValidationError("Lease is missing a rent amount field.")

    @staticmethod
    def generate_monthly_rent_charge(
        *,
        lease_id: int,
        year: int,
        month: int,
        created_by_id: int | None = None,
    ) -> GenerateMonthResult:
        """
        Generate the monthly rent charge for a lease for a given year+month.

        Args:
            lease_id: Lease PK.
            year: 4-digit year.
            month: 1-12.
            created_by_id: Optional user id for audit.

        Returns:
            GenerateMonthResult: created=False if charge already exists.
        """
        # Step 1: validate month input
        if month < 1 or month > 12:
            raise ValidationError("month must be between 1 and 12.")

        with transaction.atomic():
            # Step 2: lock lease to avoid concurrent generators racing
            lease = Lease.objects.select_for_update().get(id=lease_id)

            # Step 3: compute due date for this month
            due_date = RentChargeService._lease_due_date_for_month(lease, year, month)
            month_start = RentChargeService._month_start(year, month)

            # Step 4: validate month within lease term
            if lease.start_date and month_start < lease.start_date.replace(day=1):
                raise ValidationError("Cannot generate charges before lease start month.")

            if hasattr(lease, "end_date") and lease.end_date:
                if month_start > lease.end_date.replace(day=1):
                    raise ValidationError("Cannot generate charges after lease end month.")

            # Step 5: rent amount
            rent_amount = RentChargeService._get_rent_amount(lease)
            if rent_amount <= 0:
                raise ValidationError("Lease rent amount must be > 0 to generate rent charges.")

            # Step 6: idempotency
            existing = Charge.objects.filter(
                organization_id=lease.organization_id,
                lease_id=lease.id,
                kind=ChargeKind.RENT,
                due_date=due_date,
            ).first()

            if existing:
                return GenerateMonthResult(
                    lease_id=lease.id,
                    due_date=due_date,
                    created=False,
                    charge_id=existing.id,
                )

            charge = Charge.objects.create(
                organization_id=lease.organization_id,
                lease_id=lease.id,
                kind=ChargeKind.RENT,
                amount=rent_amount,
                due_date=due_date,
                notes=f"Rent charge for {year}-{month:02d}",
                created_by_id=created_by_id,
            )

            return GenerateMonthResult(
                lease_id=lease.id,
                due_date=due_date,
                created=True,
                charge_id=charge.id,
            )
