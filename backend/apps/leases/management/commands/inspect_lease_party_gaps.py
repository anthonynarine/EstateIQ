# Filename: backend/apps/leases/management/commands/inspect_lease_party_gaps.py

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import date
from typing import Any, Optional

from django.core.management.base import BaseCommand
from django.db.models import Prefetch
from django.utils import timezone

from apps.buildings.models import Unit
from apps.leases.models import Lease, LeaseTenant


@dataclass(frozen=True)
class LeasePartyGapRow:
    """Represents one lease-party integrity inspection row.

    Attributes:
        org_id: Organization that owns the lease.
        lease_id: Lease primary key.
        building_id: Building ID linked through the unit.
        building_name: Best available building label.
        unit_id: Unit primary key.
        unit_label: Best available unit label.
        lease_status: Persisted lease status.
        start_date: Inclusive lease start date as string.
        end_date: Exclusive lease end date as string, or None.
        active_by_dates: Whether the lease is active under [start_date, end_date).
        party_count: Number of LeaseTenant rows on the lease.
        primary_count: Number of primary tenants on the lease.
        issue_type: High-level classification of the party gap.
        severity: Severity bucket for prioritization.
        recommendation: Suggested next action for human review.
        parties: Existing lease party rows, if any.
        same_unit_leases: Timeline summary of other leases on the same unit.
    """

    org_id: int
    lease_id: int
    building_id: Optional[int]
    building_name: str
    unit_id: int
    unit_label: str
    lease_status: str
    start_date: str
    end_date: Optional[str]
    active_by_dates: bool
    party_count: int
    primary_count: int
    issue_type: str
    severity: str
    recommendation: str
    parties: list[dict[str, Any]]
    same_unit_leases: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        """Return the inspection row as a serializable dictionary.

        Returns:
            dict[str, Any]: Plain dictionary representation.
        """
        # Step 1: Convert dataclass to dict
        return asdict(self)


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease is active on the given day.

    Lease semantics are treated as:

        [start_date, end_date)

    Args:
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None for open-ended leases.
        day: Evaluation date.

    Returns:
        bool: True if the lease is active on the given day.
    """
    # Step 1: Lease is not active before its start date
    if start_date > day:
        return False

    # Step 2: Open-ended lease remains active after start
    if end_date is None:
        return True

    # Step 3: End date is exclusive
    return end_date > day


def _safe_building_name(unit: Unit) -> str:
    """Return a best-effort building display label.

    Args:
        unit: Unit instance with building relation loaded.

    Returns:
        str: Best available building label.
    """
    # Step 1: Try common display fields in priority order
    for attr_name in ("name", "title", "address", "street_address"):
        value = getattr(unit.building, attr_name, None)
        if value:
            return str(value)

    # Step 2: Fall back to a generic label
    return f"Building #{unit.building_id}"


def _safe_unit_label(unit: Unit) -> str:
    """Return a best-effort unit display label.

    Args:
        unit: Unit instance.

    Returns:
        str: Best available unit label.
    """
    # Step 1: Try common unit fields in priority order
    for attr_name in ("unit_number", "name", "label"):
        value = getattr(unit, attr_name, None)
        if value:
            return str(value)

    # Step 2: Fall back to a generic label
    return f"Unit #{unit.id}"


def _classify_party_gap(
    *,
    lease_status: str,
    active_by_dates: bool,
    party_count: int,
    primary_count: int,
) -> tuple[str, str, str]:
    """Classify the lease-party integrity problem.

    Args:
        lease_status: Persisted lease status.
        active_by_dates: Whether the lease is active by date semantics.
        party_count: Number of LeaseTenant rows.
        primary_count: Number of primary LeaseTenant rows.

    Returns:
        tuple[str, str, str]:
            - issue_type
            - severity
            - recommendation
    """
    # Step 1: Prioritize currently active leases with missing party truth
    if active_by_dates and party_count == 0:
        return (
            "active_lease_has_no_parties",
            "high",
            (
                "Active occupancy chain is broken. Determine the real tenant(s) for this lease "
                "before changing dates or status."
            ),
        )

    # Step 2: Active lease with non-zero parties but invalid primary is also high priority
    if active_by_dates and primary_count != 1:
        return (
            "active_lease_invalid_primary_count",
            "high",
            (
                "Active lease does not resolve to exactly one primary tenant. "
                "Review lease parties and correct the primary role assignment."
            ),
        )

    # Step 3: Ended lease with no parties is a historical reconstruction problem
    if lease_status == Lease.Status.ENDED and party_count == 0:
        return (
            "ended_lease_has_no_parties",
            "medium",
            (
                "Historical lease is missing party rows. Recover tenant membership if possible, "
                "or document it as unrecoverable legacy data."
            ),
        )

    # Step 4: Any non-active lease with bad primary count is still a history quality issue
    if primary_count != 1:
        return (
            "non_active_lease_invalid_primary_count",
            "medium",
            (
                "Lease does not have exactly one primary tenant. Review whether party roles were "
                "saved correctly."
            ),
        )

    # Step 5: Default fallback
    return (
        "lease_party_integrity_gap",
        "medium",
        "Review lease-party data manually.",
    )


class Command(BaseCommand):
    """Inspect lease rows with party integrity gaps.

    This command is read-only and safe to run in development, staging,
    and production.

    It focuses on leases that have:
    - zero LeaseTenant rows
    - zero primary tenants
    - multiple primary tenants

    Examples:
        python manage.py inspect_lease_party_gaps
        python manage.py inspect_lease_party_gaps --org-id 2
        python manage.py inspect_lease_party_gaps --lease-id 3
        python manage.py inspect_lease_party_gaps --only-active
        python manage.py inspect_lease_party_gaps --json
    """

    help = "Inspect leases with missing lease parties or invalid primary tenant counts."

    def add_arguments(self, parser) -> None:
        """Register CLI arguments."""
        # Step 1: Optional org scoping
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Restrict the inspection to one organization ID.",
        )

        # Step 2: Optional direct lease scoping
        parser.add_argument(
            "--lease-id",
            type=int,
            dest="lease_id",
            help="Restrict the inspection to one lease ID.",
        )

        # Step 3: Optional active-only filter
        parser.add_argument(
            "--only-active",
            action="store_true",
            dest="only_active",
            help="Show only leases that are active by date semantics today.",
        )

        # Step 4: Optional machine-readable output
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Output results as JSON.",
        )

    def handle(self, *args, **options) -> None:
        """Execute the party-gap inspection command."""
        # Step 1: Resolve runtime options
        today = timezone.localdate()
        org_id = options.get("org_id")
        lease_id = options.get("lease_id")
        only_active = options.get("only_active", False)
        as_json = options.get("as_json", False)

        # Step 2: Load leases and related data
        queryset = (
            Lease.objects.select_related("organization", "unit", "unit__building")
            .prefetch_related(
                Prefetch(
                    "parties",
                    queryset=LeaseTenant.objects.select_related("tenant").order_by("id"),
                )
            )
            .order_by("organization_id", "unit_id", "start_date", "id")
        )

        if org_id is not None:
            queryset = queryset.filter(organization_id=org_id)

        if lease_id is not None:
            queryset = queryset.filter(id=lease_id)

        leases = list(queryset)

        if not leases:
            self.stdout.write(self.style.WARNING("No leases found for the provided filters."))
            return

        # Step 3: Identify the leases that actually have party gaps
        flagged_leases: list[Lease] = []
        unit_ids: set[int] = set()

        for lease in leases:
            parties = list(lease.parties.all())
            party_count = len(parties)
            primary_count = sum(
                1 for party in parties if party.role == LeaseTenant.Role.PRIMARY
            )
            active_by_dates = _is_active_on_day(
                start_date=lease.start_date,
                end_date=lease.end_date,
                day=today,
            )

            has_gap = party_count == 0 or primary_count != 1
            if only_active and not active_by_dates:
                continue

            if has_gap:
                flagged_leases.append(lease)
                unit_ids.add(lease.unit_id)

        if not flagged_leases:
            self.stdout.write(self.style.SUCCESS("No lease party gaps found for the provided filters."))
            return

        # Step 4: Load same-unit lease timelines for context
        same_unit_leases = list(
            Lease.objects.filter(unit_id__in=unit_ids)
            .select_related("unit")
            .order_by("unit_id", "start_date", "id")
        )

        same_unit_map: dict[int, list[Lease]] = {}
        for lease in same_unit_leases:
            same_unit_map.setdefault(lease.unit_id, []).append(lease)

        # Step 5: Build detailed inspection rows
        rows: list[LeasePartyGapRow] = []

        for lease in flagged_leases:
            parties = list(lease.parties.all())
            party_count = len(parties)
            primary_count = sum(
                1 for party in parties if party.role == LeaseTenant.Role.PRIMARY
            )
            active_by_dates = _is_active_on_day(
                start_date=lease.start_date,
                end_date=lease.end_date,
                day=today,
            )

            issue_type, severity, recommendation = _classify_party_gap(
                lease_status=lease.status,
                active_by_dates=active_by_dates,
                party_count=party_count,
                primary_count=primary_count,
            )

            party_rows = []
            for party in parties:
                party_rows.append(
                    {
                        "lease_tenant_id": party.id,
                        "tenant_id": party.tenant_id,
                        "tenant_name": party.tenant.full_name,
                        "tenant_email": party.tenant.email,
                        "tenant_phone": party.tenant.phone,
                        "role": party.role,
                    }
                )

            same_unit_rows = []
            for related_lease in same_unit_map.get(lease.unit_id, []):
                related_parties = list(getattr(related_lease, "parties", []).all()) if hasattr(related_lease, "parties") else []
                same_unit_rows.append(
                    {
                        "lease_id": related_lease.id,
                        "status": related_lease.status,
                        "start_date": str(related_lease.start_date),
                        "end_date": str(related_lease.end_date) if related_lease.end_date else None,
                        "active_by_dates": _is_active_on_day(
                            start_date=related_lease.start_date,
                            end_date=related_lease.end_date,
                            day=today,
                        ),
                        "is_target_lease": related_lease.id == lease.id,
                    }
                )

            rows.append(
                LeasePartyGapRow(
                    org_id=lease.organization_id,
                    lease_id=lease.id,
                    building_id=lease.unit.building_id,
                    building_name=_safe_building_name(lease.unit),
                    unit_id=lease.unit_id,
                    unit_label=_safe_unit_label(lease.unit),
                    lease_status=lease.status,
                    start_date=str(lease.start_date),
                    end_date=str(lease.end_date) if lease.end_date else None,
                    active_by_dates=active_by_dates,
                    party_count=party_count,
                    primary_count=primary_count,
                    issue_type=issue_type,
                    severity=severity,
                    recommendation=recommendation,
                    parties=party_rows,
                    same_unit_leases=same_unit_rows,
                )
            )

        # Step 6: Sort rows so the most urgent items appear first
        severity_rank = {"high": 0, "medium": 1, "low": 2}
        rows.sort(
            key=lambda row: (
                severity_rank.get(row.severity, 9),
                row.org_id,
                row.building_id or 0,
                row.unit_id,
                row.lease_id,
            )
        )

        # Step 7: Emit JSON if requested
        if as_json:
            payload = {
                "evaluated_on": str(today),
                "row_count": len(rows),
                "rows": [row.to_dict() for row in rows],
            }
            self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
            return

        # Step 8: Print human-readable output
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.HTTP_INFO("LEASE PARTY GAP INSPECTION"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"Evaluated on: {today}")
        self.stdout.write(f"Rows found: {len(rows)}")
        self.stdout.write("")

        for row in rows:
            self.stdout.write("-" * 80)
            self.stdout.write(
                self.style.WARNING(
                    f"{row.issue_type} | severity={row.severity.upper()} | "
                    f"org={row.org_id} | lease={row.lease_id}"
                )
            )
            self.stdout.write("-" * 80)
            self.stdout.write(
                f"Building: {row.building_name} (id={row.building_id}) | "
                f"Unit: {row.unit_label} (id={row.unit_id})"
            )
            self.stdout.write(
                f"Lease: status={row.lease_status} | "
                f"start_date={row.start_date} | "
                f"end_date={row.end_date} | "
                f"active_by_dates={row.active_by_dates}"
            )
            self.stdout.write(
                f"Lease parties: party_count={row.party_count} | "
                f"primary_count={row.primary_count}"
            )
            self.stdout.write(f"Recommendation: {row.recommendation}")

            self.stdout.write("Current parties:")
            if row.parties:
                for party in row.parties:
                    self.stdout.write(
                        "  "
                        f"- lease_tenant_id={party['lease_tenant_id']} | "
                        f"tenant_id={party['tenant_id']} | "
                        f"name={party['tenant_name']} | "
                        f"role={party['role']} | "
                        f"email={party['tenant_email']} | "
                        f"phone={party['tenant_phone']}"
                    )
            else:
                self.stdout.write("  - none")

            self.stdout.write("Same-unit lease timeline:")
            for related in row.same_unit_leases:
                marker = "TARGET" if related["is_target_lease"] else "OTHER"
                self.stdout.write(
                    "  "
                    f"- [{marker}] lease_id={related['lease_id']} | "
                    f"status={related['status']} | "
                    f"start_date={related['start_date']} | "
                    f"end_date={related['end_date']} | "
                    f"active_by_dates={related['active_by_dates']}"
                )

            self.stdout.write("")

        # Step 9: Print a final summary line
        self.stdout.write(
            self.style.SUCCESS(
                f"Inspection completed for {len(rows)} lease party gap row(s)."
            )
        )
