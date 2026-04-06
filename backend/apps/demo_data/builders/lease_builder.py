# Filename: backend/apps/demo_data/builders/lease_builder.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db import transaction

from apps.buildings.models import Unit
from apps.demo_data.scenarios import DEMO_LEASE_SCENARIOS
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class DemoLeaseBuildResult:
    """Structured result for seeded lease references."""

    lease_ids_by_code: dict[str, int]


class DemoLeaseBuilder:
    """Create or reconcile the deterministic lease history timeline."""

    @classmethod
    @transaction.atomic
    def build(
        cls,
        *,
        organization_id: int,
        unit_ids_by_code: dict[str, int],
        tenant_ids_by_code: dict[str, int],
    ) -> DemoLeaseBuildResult:
        """Create or reconcile demo leases and their primary tenant links.

        Args:
            organization_id: Target organization primary key.
            unit_ids_by_code: Stable unit code -> unit id lookup.
            tenant_ids_by_code: Stable tenant code -> tenant id lookup.

        Returns:
            DemoLeaseBuildResult: Stable lease code -> id lookup map.
        """
        lease_ids_by_code: dict[str, int] = {}

        # Step 1: build the configured lease timeline
        for lease_scenario in DEMO_LEASE_SCENARIOS:
            lease = cls._build_lease(
                organization_id=organization_id,
                unit_ids_by_code=unit_ids_by_code,
                scenario=lease_scenario,
            )

            cls._build_primary_party(
                organization_id=organization_id,
                lease=lease,
                tenant_ids_by_code=tenant_ids_by_code,
                tenant_code=lease_scenario["tenant_code"],
            )

            lease_ids_by_code[lease_scenario["code"]] = lease.id

        return DemoLeaseBuildResult(
            lease_ids_by_code=lease_ids_by_code,
        )

    @staticmethod
    def _parse_date(raw_value: str | None) -> date | None:
        """Parse an ISO date string into a date object.

        Args:
            raw_value: ISO date string or None.

        Returns:
            date | None: Parsed date or None.
        """
        # Step 1: allow null end dates for active leases
        if raw_value in (None, ""):
            return None

        # Step 2: parse ISO date
        return date.fromisoformat(raw_value)

    @classmethod
    def _normalize_end_date(
        cls,
        *,
        raw_end_date: str | None,
        status: str,
    ) -> date | None:
        """Normalize scenario end dates into the Lease model's semantics.

        The demo scenarios read more naturally as inclusive "last occupied day"
        dates, while the Lease model uses end-exclusive semantics.

        Example:
            Scenario end_date = 2022-03-31
            Stored lease end_date = 2022-04-01

        Args:
            raw_end_date: Raw scenario end date.
            status: Lease scenario status.

        Returns:
            date | None: Normalized end date for persistence.
        """
        # Step 1: parse the raw scenario date
        parsed_end_date = cls._parse_date(raw_end_date)

        # Step 2: active leases should stay open-ended
        if status == Lease.Status.ACTIVE:
            return None

        # Step 3: keep ended leases aligned with end-exclusive semantics
        if parsed_end_date is None:
            return None

        return parsed_end_date + timedelta(days=1)

    @classmethod
    def _build_lease(
        cls,
        *,
        organization_id: int,
        unit_ids_by_code: dict[str, int],
        scenario: dict[str, Any],
    ) -> Lease:
        """Create or reconcile one lease from a scenario definition.

        Args:
            organization_id: Target organization primary key.
            unit_ids_by_code: Stable unit code -> unit id lookup.
            scenario: Lease scenario payload.

        Returns:
            Lease: Created or updated lease instance.
        """
        # Step 1: resolve the target unit
        unit_id = unit_ids_by_code[scenario["unit_code"]]
        unit = Unit.objects.get(
            id=unit_id,
            organization_id=organization_id,
        )

        # Step 2: normalize scenario values
        start_date = cls._parse_date(scenario["start_date"])
        end_date = cls._normalize_end_date(
            raw_end_date=scenario["end_date"],
            status=scenario["status"],
        )
        rent_amount = Decimal(scenario["rent_amount"])
        security_deposit_amount = (
            Decimal(scenario["security_deposit_amount"])
            if scenario["security_deposit_amount"] not in (None, "")
            else None
        )

        # Step 3: use organization + unit + start_date as the stable anchor
        lease, _ = Lease.objects.get_or_create(
            organization_id=organization_id,
            unit=unit,
            start_date=start_date,
            defaults={
                "end_date": end_date,
                "rent_amount": rent_amount,
                "security_deposit_amount": security_deposit_amount,
                "rent_due_day": scenario["rent_due_day"],
                "status": scenario["status"],
            },
        )

        # Step 4: keep the lease deterministic across reruns
        dirty_fields: list[str] = []

        if lease.end_date != end_date:
            lease.end_date = end_date
            dirty_fields.append("end_date")

        if lease.rent_amount != rent_amount:
            lease.rent_amount = rent_amount
            dirty_fields.append("rent_amount")

        if lease.security_deposit_amount != security_deposit_amount:
            lease.security_deposit_amount = security_deposit_amount
            dirty_fields.append("security_deposit_amount")

        if lease.rent_due_day != scenario["rent_due_day"]:
            lease.rent_due_day = scenario["rent_due_day"]
            dirty_fields.append("rent_due_day")

        if lease.status != scenario["status"]:
            lease.status = scenario["status"]
            dirty_fields.append("status")

        if dirty_fields:
            lease.save(update_fields=dirty_fields)

        return lease

    @staticmethod
    def _build_primary_party(
        *,
        organization_id: int,
        lease: Lease,
        tenant_ids_by_code: dict[str, int],
        tenant_code: str,
    ) -> LeaseTenant:
        """Create or reconcile the primary tenant link for a lease.

        Args:
            organization_id: Target organization primary key.
            lease: Lease instance.
            tenant_ids_by_code: Stable tenant code -> tenant id lookup.
            tenant_code: Scenario tenant code.

        Returns:
            LeaseTenant: Primary tenant link for the lease.
        """
        # Step 1: resolve the target tenant
        tenant_id = tenant_ids_by_code[tenant_code]
        tenant = Tenant.objects.get(
            id=tenant_id,
            organization_id=organization_id,
        )

        # Step 2: look for an existing primary lease party
        primary_party = (
            LeaseTenant.objects.filter(
                lease=lease,
                role=LeaseTenant.Role.PRIMARY,
            )
            .order_by("id")
            .first()
        )

        # Step 3: create the primary link when missing
        if primary_party is None:
            return LeaseTenant.objects.create(
                organization_id=organization_id,
                lease=lease,
                tenant=tenant,
                role=LeaseTenant.Role.PRIMARY,
            )

        # Step 4: reconcile the existing primary link when present
        dirty_fields: list[str] = []

        if primary_party.organization_id != organization_id:
            primary_party.organization_id = organization_id
            dirty_fields.append("organization")

        if primary_party.tenant_id != tenant.id:
            primary_party.tenant = tenant
            dirty_fields.append("tenant")

        if primary_party.role != LeaseTenant.Role.PRIMARY:
            primary_party.role = LeaseTenant.Role.PRIMARY
            dirty_fields.append("role")

        if dirty_fields:
            primary_party.save(update_fields=dirty_fields)

        return primary_party