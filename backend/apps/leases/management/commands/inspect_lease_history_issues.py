# Filename: backend/apps/leases/management/commands/inspect_lease_history_issues.py

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import date
from typing import Any, Optional

from django.core.management.base import BaseCommand
from django.db.models import Prefetch
from django.utils import timezone

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.audit import audit_lease_history_integrity
from apps.leases.models import Lease, LeaseTenant


@dataclass(frozen=True)
class LeaseInspectionRow:
    """Represents one detailed inspection result for a flagged lease.

    Attributes:
        issue_code: The audit issue code that caused the lease to be inspected.
        severity: Severity from the audit issue.
        org_id: Owning organization ID.
        lease_id: Lease primary key.
        building_id: Building ID for the unit.
        building_name: Best available building label.
        unit_id: Unit ID.
        unit_label: Best available unit label.
        lease_status: Persisted lease status.
        start_date: Lease inclusive start date.
        end_date: Lease exclusive end date or None.
        active_by_dates: Whether the lease is active under [start_date, end_date).
        party_count: Number of LeaseTenant rows on the lease.
        primary_count: Number of primary LeaseTenant rows on the lease.
        parties: Human-readable party breakdown.
        same_unit_leases: Summary of other leases on the same unit.
        issue_payload: Original audit payload for context.
    """

    issue_code: str
    severity: str
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
    parties: list[dict[str, Any]]
    same_unit_leases: list[dict[str, Any]]
    issue_payload: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """Return the inspection row as a serializable dictionary.

        Returns:
            dict[str, Any]: Plain dict view of the inspection row.
        """
        # Step 1: Convert dataclass to dict
        return asdict(self)


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease is active on a given day.

    Lease semantics are treated as [start_date, end_date).

    Args:
        start_date: Inclusive start date.
        end_date: Exclusive end date, or None for open-ended leases.
        day: Evaluation date.

    Returns:
        bool: True if active on the given day.
    """
    # Step 1: Lease is not active before its start
    if start_date > day:
        return False

    # Step 2: Open-ended lease remains active after start
    if end_date is None:
        return True

    # Step 3: End date is exclusive
    return end_date > day


def _safe_building_name(unit: Unit) -> str:
    """Return a best-effort building name for display.

    Args:
        unit: Unit instance with building relation loaded.

    Returns:
        str: Best available building label.
    """
    # Step 1: Try common naming fields in priority order
    for attr_name in ("name", "title", "address", "street_address"):
        value = getattr(unit.building, attr_name, None)
        if value:
            return str(value)

    # Step 2: Fall back to a generic label
    return f"Building #{unit.building_id}"


def _safe_unit_label(unit: Unit) -> str:
    """Return a best-effort unit label for display.

    Args:
        unit: Unit instance.

    Returns:
        str: Best available unit label.
    """
    # Step 1: Try common unit display fields in priority order
    for attr_name in ("unit_number", "name", "label"):
        value = getattr(unit, attr_name, None)
        if value:
            return str(value)

    # Step 2: Fall back to a generic label
    return f"Unit #{unit.id}"


class Command(BaseCommand):
    """Inspect lease history issues with full row-level context.

    This command is read-only and safe to run in development, staging,
    and production.

    Examples:
        python manage.py inspect_lease_history_issues
        python manage.py inspect_lease_history_issues --org-id 2
        python manage.py inspect_lease_history_issues --lease-id 3
        python manage.py inspect_lease_history_issues --only-code active_lease_missing_primary
        python manage.py inspect_lease_history_issues --json
    """

    help = "Inspect lease history audit findings with detailed lease, unit, and party context."

    def add_arguments(self, parser) -> None:
        """Register CLI arguments."""
        # Step 1: Optional org scoping
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Inspect only one organization ID.",
        )

        # Step 2: Optional direct lease filter
        parser.add_argument(
            "--lease-id",
            type=int,
            dest="lease_id",
            help="Inspect only one lease ID if it appears in audit findings.",
        )

        # Step 3: Optional audit issue code filter
        parser.add_argument(
            "--only-code",
            type=str,
            dest="only_code",
            help="Restrict inspection to one audit issue code.",
        )

        # Step 4: Optional JSON output
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Output detailed inspection rows as JSON.",
        )

    def handle(self, *args, **options) -> None:
        """Run the detailed issue inspection command."""
        # Step 1: Resolve evaluation date
        today = timezone.localdate()

        # Step 2: Run the audit first so inspection stays consistent with findings
        report = audit_lease_history_integrity(
            org_id=options.get("org_id"),
            today=today,
        )

        # Step 3: Filter issues if requested
        issues = report.issues
        only_code = options.get("only_code")
        if only_code:
            issues = [issue for issue in issues if issue.code == only_code]

        # Step 4: Build a unique lease ID list from issue payloads
        lease_filter = options.get("lease_id")
        lease_ids: set[int] = set()
        issue_map: dict[int, list] = {}

        for issue in issues:
            lease_id = issue.payload.get("lease_id")
            if lease_id is None:
                continue

            if lease_filter is not None and lease_id != lease_filter:
                continue

            lease_ids.add(lease_id)
            issue_map.setdefault(lease_id, []).append(issue)

        if not lease_ids:
            self.stdout.write(self.style.WARNING("No matching flagged leases found."))
            return

        # Step 5: Load flagged leases with parties and related unit/building data
        flagged_leases = list(
            Lease.objects.filter(id__in=lease_ids)
            .select_related("organization", "unit", "unit__building")
            .prefetch_related(
                Prefetch(
                    "parties",
                    queryset=LeaseTenant.objects.select_related("tenant").order_by("id"),
                )
            )
            .order_by("organization_id", "unit_id", "start_date", "id")
        )

        # Step 6: Load same-unit lease history for context
        unit_ids = {lease.unit_id for lease in flagged_leases}
        same_unit_leases = list(
            Lease.objects.filter(unit_id__in=unit_ids)
            .select_related("unit")
            .order_by("unit_id", "start_date", "id")
        )

        same_unit_map: dict[int, list[Lease]] = {}
        for lease in same_unit_leases:
            same_unit_map.setdefault(lease.unit_id, []).append(lease)

        # Step 7: Build detailed inspection rows
        inspection_rows: list[LeaseInspectionRow] = []
        for lease in flagged_leases:
            parties = list(lease.parties.all())
            primary_count = sum(
                1 for party in parties if party.role == LeaseTenant.Role.PRIMARY
            )

            related_unit_leases = []
            for related_lease in same_unit_map.get(lease.unit_id, []):
                related_unit_leases.append(
                    {
                        "lease_id": related_lease.id,
                        "status": related_lease.status,
                        "start_date": str(related_lease.start_date),
                        "end_date": (
                            str(related_lease.end_date)
                            if related_lease.end_date
                            else None
                        ),
                        "active_by_dates": _is_active_on_day(
                            start_date=related_lease.start_date,
                            end_date=related_lease.end_date,
                            day=today,
                        ),
                        "is_target_lease": related_lease.id == lease.id,
                    }
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

            for issue in issue_map.get(lease.id, []):
                inspection_rows.append(
                    LeaseInspectionRow(
                        issue_code=issue.code,
                        severity=issue.severity,
                        org_id=lease.organization_id,
                        lease_id=lease.id,
                        building_id=lease.unit.building_id,
                        building_name=_safe_building_name(lease.unit),
                        unit_id=lease.unit_id,
                        unit_label=_safe_unit_label(lease.unit),
                        lease_status=lease.status,
                        start_date=str(lease.start_date),
                        end_date=str(lease.end_date) if lease.end_date else None,
                        active_by_dates=_is_active_on_day(
                            start_date=lease.start_date,
                            end_date=lease.end_date,
                            day=today,
                        ),
                        party_count=len(parties),
                        primary_count=primary_count,
                        parties=party_rows,
                        same_unit_leases=related_unit_leases,
                        issue_payload=issue.payload,
                    )
                )

        # Step 8: Emit JSON when requested
        if options.get("as_json"):
            payload = {
                "evaluated_on": str(today),
                "row_count": len(inspection_rows),
                "rows": [row.to_dict() for row in inspection_rows],
            }
            self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
            return

        # Step 9: Emit human-readable output
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.HTTP_INFO("LEASE HISTORY ISSUE INSPECTION"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"Evaluated on: {today}")
        self.stdout.write(f"Matching flagged leases: {len(flagged_leases)}")
        self.stdout.write(f"Detailed rows: {len(inspection_rows)}")
        self.stdout.write("")

        for row in inspection_rows:
            self.stdout.write("-" * 80)
            self.stdout.write(
                self.style.WARNING(
                    f"{row.issue_code} | severity={row.severity.upper()} | "
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
                f"start_date={row.start_date} | end_date={row.end_date} | "
                f"active_by_dates={row.active_by_dates}"
            )
            self.stdout.write(
                f"Parties: party_count={row.party_count} | primary_count={row.primary_count}"
            )
            self.stdout.write("Issue payload:")
            self.stdout.write
 