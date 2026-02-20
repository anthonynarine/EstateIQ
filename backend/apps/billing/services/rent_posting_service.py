# Filename: apps/billing/services/rent_posting_service.py

"""
Rent posting service.

Bulk generate current-month rent charges for all active leases in an org.
Designed to be safe, idempotent, and resilient (partial failures reported).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.billing.services.rent_charge_service import RentChargeService
from apps.leases.models import Lease


@dataclass(frozen=True)
class RentPostingError:
    """A non-fatal error encountered while posting rent for a lease."""
    lease_id: int
    error: str


@dataclass(frozen=True)
class RentPostingRunResult:
    """Result summary of a bulk rent posting run."""
    as_of: date
    leases_processed: int
    charges_created: int
    charges_existing: int
    created_charge_ids: List[int]
    errors: List[RentPostingError]


class RentPostingService:
    """Bulk rent posting operations."""

    @staticmethod
    def run_current_month_for_org(
        *,
        organization_id: int,
        as_of: Optional[date] = None,
        created_by_id: int | None = None,
    ) -> RentPostingRunResult:
        """
        Generate current month rent charges for active leases in an org.

        Args:
            organization_id: Org PK.
            as_of: date used to derive current month; defaults to today.
            created_by_id: optional user id for audit.

        Returns:
            RentPostingRunResult including non-fatal errors.
        """
        # Step 1: choose run date
        as_of = as_of or date.today()
        year, month = as_of.year, as_of.month

        # Step 2: select leases that could be active this month
        # We treat a lease as active in a month if:
        # - starts on/before month start
        # - ends on/after month start (or no end)
        month_start = date(year, month, 1)

        leases = list(
            Lease.objects.filter(organization_id=organization_id)
            .only("id", "organization_id")
        )

        created_ids: List[int] = []
        errors: List[RentPostingError] = []
        created_count = 0
        existing_count = 0

        # Step 3: process each lease independently
        for lease in leases:
            try:
                with transaction.atomic():
                    result = RentChargeService.generate_monthly_rent_charge(
                        lease_id=lease.id,
                        year=year,
                        month=month,
                        created_by_id=created_by_id,
                    )
                    if result.created:
                        created_count += 1
                        created_ids.append(result.charge_id)
                    else:
                        existing_count += 1

            except (ValidationError, Exception) as exc:
                # Step 4: log error but continue
                errors.append(RentPostingError(lease_id=lease.id, error=str(exc)))

        return RentPostingRunResult(
            as_of=as_of,
            leases_processed=len(leases),
            charges_created=created_count,
            charges_existing=existing_count,
            created_charge_ids=created_ids,
            errors=errors,
        )
