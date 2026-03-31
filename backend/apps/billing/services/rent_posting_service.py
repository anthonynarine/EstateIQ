# Filename: backend/apps/billing/services/rent_posting_service.py

"""
Rent posting service for the billing domain.

This module owns bulk current-month rent posting for an organization.

Why this file exists:
- Keeps bulk month posting logic out of views.
- Provides an explicit operational workflow for rent posting.
- Preserves idempotent rent generation by delegating actual charge creation
  to `RentChargeService.generate_monthly_rent_charge(...)`.

Design goals:
- Organization-scoped
- Month-aware
- Deterministic
- Non-fatal on per-lease failures
- Safe for operational use in production

Important domain rule:
A lease is considered eligible for a target month when its lease interval
overlaps the month interval:

    lease interval = [lease_start, lease_end)
    month interval = [month_start, next_month_start)

This respects the end-exclusive lease behavior used elsewhere in EstateIQ.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet

from apps.billing.services.rent_charge_service import RentChargeService
from apps.leases.models import Lease

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RentPostingError:
    """
    Non-fatal error encountered while posting rent for a single lease.

    Attributes:
        lease_id: Primary key of the lease that failed.
        error: Human-readable error message.
    """

    lease_id: int
    error: str


@dataclass(frozen=True)
class RentPostingRunResult:
    """
    Summary of a bulk rent-posting run.

    Attributes:
        as_of: Run date used to derive the posting month.
        leases_processed: Number of lease candidates processed.
        charges_created: Number of new charges created.
        charges_existing: Number of already-existing month charges encountered.
        created_charge_ids: Primary keys of newly created charges.
        errors: Non-fatal per-lease failures.
    """

    as_of: date
    leases_processed: int
    charges_created: int
    charges_existing: int
    created_charge_ids: list[int]
    errors: list[RentPostingError]


class RentPostingService:
    """
    Service for bulk month rent posting.

    This service does not create rent math itself. It identifies the correct
    lease candidates for the target month and delegates idempotent charge
    generation to `RentChargeService`.
    """

    @staticmethod
    def _first_day_of_next_month(month_start: date) -> date:
        """
        Return the first day of the month after `month_start`.

        Args:
            month_start: First day of the current target month.

        Returns:
            date: First day of the next month.
        """
        # Step 1: roll forward across year boundaries safely
        if month_start.month == 12:
            return date(month_start.year + 1, 1, 1)

        # Step 2: standard next-month increment
        return date(month_start.year, month_start.month + 1, 1)

    @staticmethod
    def _resolve_lease_date_fields() -> tuple[str | None, str | None]:
        """
        Resolve the start and end date field names used by the Lease model.

        Supported variants:
        - `start_date` / `end_date`
        - `starts_on` / `ends_on`

        Returns:
            tuple[str | None, str | None]: Start and end field names.
        """
        # Step 1: inspect model fields dynamically
        field_names = {field.name for field in Lease._meta.fields}

        # Step 2: resolve the start field
        start_field = None
        if "start_date" in field_names:
            start_field = "start_date"
        elif "starts_on" in field_names:
            start_field = "starts_on"

        # Step 3: resolve the end field
        end_field = None
        if "end_date" in field_names:
            end_field = "end_date"
        elif "ends_on" in field_names:
            end_field = "ends_on"

        return start_field, end_field

    @classmethod
    def _build_candidate_lease_queryset(
        cls,
        *,
        organization_id: int,
        month_start: date,
        next_month_start: date,
    ) -> QuerySet[Lease]:
        """
        Build the candidate lease queryset for the target month.

        Eligibility rule:
        A lease overlaps the target month if:

            lease_start < next_month_start
            AND
            (lease_end IS NULL OR lease_end > month_start)

        This matches the end-exclusive interval model and includes leases that
        start mid-month rather than requiring them to start on or before the
        first day of the month.

        Args:
            organization_id: Active organization primary key.
            month_start: First day of the target month.
            next_month_start: First day of the following month.

        Returns:
            QuerySet[Lease]: Organization-scoped lease candidates for the month.
        """
        # Step 1: start from the organization boundary
        queryset = Lease.objects.filter(organization_id=organization_id).only(
            "id",
            "organization_id",
        )

        # Step 2: resolve schema-specific lease date fields
        start_field, end_field = cls._resolve_lease_date_fields()

        # Step 3: if the schema does not expose date fields, fall back safely
        # and rely on the downstream rent-charge service for eligibility checks
        if start_field is None:
            logger.warning(
                "billing.rent_posting.start_field_missing",
                extra={"organization_id": organization_id},
            )
            return queryset.order_by("id")

        # Step 4: filter leases whose interval overlaps the target month
        overlap_filter = Q(**{f"{start_field}__lt": next_month_start})

        if end_field is not None:
            overlap_filter &= (
                Q(**{f"{end_field}__isnull": True})
                | Q(**{f"{end_field}__gt": month_start})
            )

        # Step 5: return deterministically ordered lease candidates
        return queryset.filter(overlap_filter).order_by("id")

    @staticmethod
    def _serialize_error_message(exc: Exception) -> str:
        """
        Convert an exception into a stable error string.

        Args:
            exc: Exception raised during per-lease processing.

        Returns:
            str: Human-readable error message.
        """
        # Step 1: prefer the exception string when available
        message = str(exc).strip()
        if message:
            return message

        # Step 2: fall back to the exception class name
        return exc.__class__.__name__

    @classmethod
    def run_current_month_for_org(
        cls,
        *,
        organization_id: int,
        as_of: Optional[date] = None,
        created_by_id: int | None = None,
    ) -> RentPostingRunResult:
        """
        Generate target-month rent charges for eligible leases in an org.

        This operation is resilient: one failing lease does not abort the whole
        run. Each lease is processed in its own transaction so the run can
        continue and report partial success safely.

        Args:
            organization_id: Organization primary key.
            as_of: Date used to derive the target month. Defaults to today.
            created_by_id: Optional actor primary key for audit-aware charge
                generation.

        Returns:
            RentPostingRunResult: Summary of the posting run.
        """
        # Step 1: derive the target month interval
        as_of = as_of or date.today()
        month_start = date(as_of.year, as_of.month, 1)
        next_month_start = cls._first_day_of_next_month(month_start)

        # Step 2: select only leases whose intervals overlap the target month
        leases = list(
            cls._build_candidate_lease_queryset(
                organization_id=organization_id,
                month_start=month_start,
                next_month_start=next_month_start,
            )
        )

        created_charge_ids: list[int] = []
        errors: list[RentPostingError] = []
        charges_created = 0
        charges_existing = 0

        # Step 3: process each lease independently for resilience
        for lease in leases:
            try:
                with transaction.atomic():
                    result = RentChargeService.generate_monthly_rent_charge(
                        lease_id=lease.id,
                        year=month_start.year,
                        month=month_start.month,
                        created_by_id=created_by_id,
                    )

                if result.created:
                    charges_created += 1
                    created_charge_ids.append(result.charge_id)
                else:
                    charges_existing += 1

            except ValidationError as exc:
                error_message = cls._serialize_error_message(exc)
                errors.append(
                    RentPostingError(
                        lease_id=lease.id,
                        error=error_message,
                    )
                )
                logger.warning(
                    "billing.rent_posting.lease_validation_failed",
                    extra={
                        "organization_id": organization_id,
                        "lease_id": lease.id,
                        "error": error_message,
                    },
                )

            except Exception as exc:
                error_message = cls._serialize_error_message(exc)
                errors.append(
                    RentPostingError(
                        lease_id=lease.id,
                        error=error_message,
                    )
                )
                logger.exception(
                    "billing.rent_posting.lease_unexpected_failure",
                    extra={
                        "organization_id": organization_id,
                        "lease_id": lease.id,
                    },
                )

        # Step 4: emit a run-level operational log
        logger.info(
            "billing.rent_posting.run_completed",
            extra={
                "organization_id": organization_id,
                "as_of": as_of.isoformat(),
                "leases_processed": len(leases),
                "charges_created": charges_created,
                "charges_existing": charges_existing,
                "error_count": len(errors),
            },
        )

        # Step 5: return the stable public result contract
        return RentPostingRunResult(
            as_of=as_of,
            leases_processed=len(leases),
            charges_created=charges_created,
            charges_existing=charges_existing,
            created_charge_ids=created_charge_ids,
            errors=errors,
        )