# Filename: backend/apps/billing/services/rent_charge_service.py

"""
Rent charge generation service for the billing domain.

This module owns deterministic monthly rent-charge generation for leases.

Why this file exists:
- Keeps rent charge business rules out of views and serializers.
- Preserves idempotent monthly charge generation.
- Uses the lease as the source of truth for due day, rent amount, and
  month-eligibility rules.

Design goals:
- Explicit month-based generation
- Lease-scoped and organization-safe
- Transaction-safe
- Idempotent
- Clear lease/month eligibility behavior

Important domain rule:
A lease is eligible for a target month when its lease interval overlaps the
target month interval:

    lease interval = [lease_start, lease_end)
    month interval = [month_start, next_month_start)

This respects the end-exclusive lease behavior used elsewhere in EstateIQ.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.billing.models import Charge, ChargeKind
from apps.leases.models import Lease

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GenerateMonthResult:
    """
    Result from generating a rent charge for a lease and month.

    Attributes:
        lease_id: Lease primary key.
        due_date: Derived due date for the generated month.
        created: Whether a new charge was created.
        charge_id: Primary key of the created or existing charge.
    """

    lease_id: int
    due_date: date
    created: bool
    charge_id: int


class RentChargeService:
    """
    Service layer for creating monthly rent charges from leases.

    This service owns the write-path business rules for month-based rent
    posting. It does not build UI-oriented ledger read models.
    """

    @staticmethod
    def _field_names(model_class: type[Any]) -> set[str]:
        """
        Return concrete Django model field names for the provided model class.

        Args:
            model_class: Django model class to inspect.

        Returns:
            set[str]: Concrete model field names.
        """
        # Step 1: inspect model metadata
        return {field.name for field in model_class._meta.fields}

    @staticmethod
    def _month_start(year: int, month: int) -> date:
        """
        Return the first day of the provided month.

        Args:
            year: Four-digit year.
            month: Month number, 1 through 12.

        Returns:
            date: First day of the target month.
        """
        # Step 1: normalize to first day of month
        return date(year, month, 1)

    @staticmethod
    def _next_month_start(year: int, month: int) -> date:
        """
        Return the first day of the month after the provided year/month.

        Args:
            year: Four-digit year.
            month: Month number, 1 through 12.

        Returns:
            date: First day of the next month.
        """
        # Step 1: roll forward across year boundaries safely
        if month == 12:
            return date(year + 1, 1, 1)

        # Step 2: standard next-month increment
        return date(year, month + 1, 1)

    @staticmethod
    def _validate_year_month(*, year: int, month: int) -> None:
        """
        Validate the requested year/month inputs.

        Args:
            year: Four-digit year.
            month: Month number, 1 through 12.

        Raises:
            ValidationError: If the month is invalid.
        """
        # Step 1: validate month range
        if month < 1 or month > 12:
            raise ValidationError("month must be between 1 and 12.")

        # Step 2: keep year sanity basic and explicit
        if year < 1900 or year > 9999:
            raise ValidationError("year must be between 1900 and 9999.")

    @staticmethod
    def _get_due_day(lease: Lease) -> int:
        """
        Return the due-day-of-month using whichever field exists.

        Priority:
            1) due_day
            2) rent_due_day
            3) due_day_of_month

        Defaults to 1 if none exist.

        Args:
            lease: Lease instance.

        Returns:
            int: Due day of month.
        """
        # Step 1: try common due-day field names
        for attr in ("due_day", "rent_due_day", "due_day_of_month"):
            if hasattr(lease, attr):
                value = getattr(lease, attr)
                if value:
                    return int(value)

        # Step 2: fall back to first of month
        return 1

    @classmethod
    def _lease_due_date_for_month(cls, lease: Lease, year: int, month: int) -> date:
        """
        Compute the due date for the lease in a given month.

        Rule:
        Clamp the due day to the last day of the month if the month is shorter.

        Args:
            lease: Lease instance.
            year: Four-digit year.
            month: Month number, 1 through 12.

        Returns:
            date: Derived due date for the target month.
        """
        # Step 1: compute the next month boundary
        next_month = cls._next_month_start(year, month)

        # Step 2: derive the last day of the target month
        last_day = (next_month - date.resolution).day

        # Step 3: clamp the due day safely into the month
        due_day = min(int(cls._get_due_day(lease)), int(last_day))
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

        Args:
            lease: Lease instance.

        Returns:
            Decimal: Lease rent amount.

        Raises:
            ValidationError: If the lease does not expose a supported rent field.
        """
        # Step 1: try common rent field names
        for attr in ("rent_amount", "monthly_rent", "rent", "rent_monthly", "rent_price"):
            if hasattr(lease, attr):
                value = getattr(lease, attr)
                if value is not None:
                    return Decimal(value)

        # Step 2: fail explicitly if no supported rent field exists
        raise ValidationError("Lease is missing a rent amount field.")

    @staticmethod
    def _get_lease_start_date(lease: Lease) -> date | None:
        """
        Return the lease start date using whichever field exists.

        Args:
            lease: Lease instance.

        Returns:
            date | None: Lease start date, if present.
        """
        # Step 1: try common start-date field names
        for attr in ("start_date", "starts_on"):
            if hasattr(lease, attr):
                return getattr(lease, attr)

        return None

    @staticmethod
    def _get_lease_end_date(lease: Lease) -> date | None:
        """
        Return the lease end date using whichever field exists.

        Args:
            lease: Lease instance.

        Returns:
            date | None: Lease end date, if present.
        """
        # Step 1: try common end-date field names
        for attr in ("end_date", "ends_on"):
            if hasattr(lease, attr):
                return getattr(lease, attr)

        return None

    @classmethod
    def _month_overlaps_lease(
        cls,
        *,
        lease: Lease,
        year: int,
        month: int,
    ) -> bool:
        """
        Return whether the lease interval overlaps the target month interval.

        Lease interval:
            [lease_start, lease_end)

        Month interval:
            [month_start, next_month_start)

        Args:
            lease: Lease instance.
            year: Four-digit year.
            month: Month number, 1 through 12.

        Returns:
            bool: True if the lease overlaps the target month.
        """
        # Step 1: derive target month interval
        month_start = cls._month_start(year, month)
        next_month_start = cls._next_month_start(year, month)

        # Step 2: resolve schema-tolerant lease date fields
        lease_start = cls._get_lease_start_date(lease)
        lease_end = cls._get_lease_end_date(lease)

        # Step 3: reject months fully before the lease start
        if lease_start is not None and lease_start >= next_month_start:
            return False

        # Step 4: reject months on/after the lease end under end-exclusive logic
        if lease_end is not None and lease_end <= month_start:
            return False

        return True

    @classmethod
    def _validate_lease_month_eligibility(
        cls,
        *,
        lease: Lease,
        year: int,
        month: int,
    ) -> None:
        """
        Validate that the lease is eligible for the target month.

        Args:
            lease: Lease instance.
            year: Four-digit year.
            month: Month number, 1 through 12.

        Raises:
            ValidationError: If the lease does not overlap the target month.
        """
        # Step 1: enforce interval-overlap eligibility
        if not cls._month_overlaps_lease(
            lease=lease,
            year=year,
            month=month,
        ):
            raise ValidationError(
                "Cannot generate a rent charge for a month outside the lease term."
            )

    @classmethod
    def _existing_rent_charge(
        cls,
        *,
        lease: Lease,
        year: int,
        month: int,
        due_date: date,
    ) -> Charge | None:
        """
        Return an existing idempotent rent charge for the target month, if any.

        Idempotency rule:
        - Preferred anchor when supported:
            organization_id + lease_id + kind + charge_month
        - Legacy fallback when `charge_month` is not available:
            organization_id + lease_id + kind + due_date

        Why this matters:
        If a lease due day changes later, `due_date` may change for the same
        month. Using `charge_month` as the primary anchor prevents accidental
        duplicate month posting.
        """
        # Step 1: inspect schema support once
        field_names = cls._field_names(Charge)

        # Step 2: prefer charge_month as the true monthly uniqueness anchor
        if "charge_month" in field_names:
            return Charge.objects.filter(
                organization_id=lease.organization_id,
                lease_id=lease.id,
                kind=ChargeKind.RENT,
                charge_month=cls._month_start(year, month),
            ).first()

        # Step 3: fall back to due_date only for legacy schemas
        return Charge.objects.filter(
            organization_id=lease.organization_id,
            lease_id=lease.id,
            kind=ChargeKind.RENT,
            due_date=due_date,
        ).first()

    @classmethod
    def _build_charge_create_payload(
        cls,
        *,
        lease: Lease,
        rent_amount: Decimal,
        year: int,
        month: int,
        due_date: date,
        created_by_id: int | None,
    ) -> dict[str, Any]:
        """
        Build a schema-tolerant charge create payload.

        Args:
            lease: Locked lease instance.
            rent_amount: Rent amount for the month.
            year: Four-digit year.
            month: Month number, 1 through 12.
            due_date: Derived due date for the month.
            created_by_id: Optional actor primary key.

        Returns:
            dict[str, Any]: Charge create payload.
        """
        # Step 1: build required charge fields
        payload: dict[str, Any] = {
            "organization_id": lease.organization_id,
            "lease_id": lease.id,
            "kind": ChargeKind.RENT,
            "amount": rent_amount,
            "due_date": due_date,
            "notes": f"Rent charge for {year}-{month:02d}",
        }

        field_names = cls._field_names(Charge)

        # Step 2: add charge_month when supported
        if "charge_month" in field_names:
            payload["charge_month"] = cls._month_start(year, month)

        # Step 3: add optional audit fields when supported
        if created_by_id is not None and "created_by" in field_names:
            payload["created_by_id"] = created_by_id

        if created_by_id is not None and "updated_by" in field_names:
            payload["updated_by_id"] = created_by_id

        return payload

    @classmethod
    def generate_monthly_rent_charge(
        cls,
        *,
        lease_id: int,
        year: int,
        month: int,
        created_by_id: int | None = None,
    ) -> GenerateMonthResult:
        """
        Generate the monthly rent charge for a lease for a given year and month.

        Args:
            lease_id: Lease primary key.
            year: Four-digit year.
            month: Month number, 1 through 12.
            created_by_id: Optional actor primary key for audit-aware models.

        Returns:
            GenerateMonthResult: `created=False` when an idempotent charge
            already exists.

        Raises:
            ValidationError: If the requested month is invalid, the lease is not
                eligible for the month, or the lease rent amount is invalid.
        """
        # Step 1: validate the requested month input
        cls._validate_year_month(year=year, month=month)

        with transaction.atomic():
            # Step 2: lock the lease to prevent concurrent generation races
            lease = Lease.objects.select_for_update().get(id=lease_id)

            # Step 3: validate month eligibility using interval overlap
            cls._validate_lease_month_eligibility(
                lease=lease,
                year=year,
                month=month,
            )

            # Step 4: derive due date and rent amount
            due_date = cls._lease_due_date_for_month(lease, year, month)
            rent_amount = cls._get_rent_amount(lease)

            if rent_amount <= Decimal("0.00"):
                raise ValidationError(
                    "Lease rent amount must be > 0 to generate rent charges."
                )

            # Step 5: enforce idempotency
            existing_charge = cls._existing_rent_charge(
                lease=lease,
                year=year,
                month=month,
                due_date=due_date,
            )

            if existing_charge is not None:
                logger.info(
                    "billing.rent_charge.existing_returned",
                    extra={
                        "organization_id": lease.organization_id,
                        "lease_id": lease.id,
                        "charge_id": existing_charge.id,
                        "year": year,
                        "month": month,
                        "due_date": existing_charge.due_date.isoformat(),
                        "actor_id": created_by_id,
                    },
                )
                return GenerateMonthResult(
                    lease_id=lease.id,
                    due_date=existing_charge.due_date,
                    created=False,
                    charge_id=existing_charge.id,
                )

            # Step 6: create the new charge
            charge = Charge.objects.create(
                **cls._build_charge_create_payload(
                    lease=lease,
                    rent_amount=rent_amount,
                    year=year,
                    month=month,
                    due_date=due_date,
                    created_by_id=created_by_id,
                )
            )

            # Step 7: emit an operational log
            logger.info(
                "billing.rent_charge.created",
                extra={
                    "organization_id": lease.organization_id,
                    "lease_id": lease.id,
                    "charge_id": charge.id,
                    "year": year,
                    "month": month,
                    "due_date": due_date.isoformat(),
                    "amount": str(rent_amount),
                    "actor_id": created_by_id,
                },
            )

            # Step 8: return the stable result contract
            return GenerateMonthResult(
                lease_id=lease.id,
                due_date=due_date,
                created=True,
                charge_id=charge.id,
            )