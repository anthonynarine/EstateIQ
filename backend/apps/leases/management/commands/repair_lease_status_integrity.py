# Filename: backend/apps/leases/management/commands/repair_lease_status_integrity.py

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import date
from typing import Optional

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.leases.models import Lease, LeaseTenant


@dataclass(frozen=True)
class RepairCandidate:
    """Represents one lease row evaluated by the repair command.

    Attributes:
        lease_id: Primary key of the lease.
        org_id: Organization ID that owns the lease.
        unit_id: Unit ID linked to the lease.
        previous_status: Lease status before any mutation.
        start_date: Inclusive lease start date as string.
        end_date: Exclusive lease end date as string, or None.
        active_by_dates: Whether the lease is active using [start_date, end_date).
        party_count: Number of LeaseTenant rows linked to the lease.
        primary_count: Number of primary LeaseTenant rows linked to the lease.
        action: What the command decided to do.
        reason: Human-readable explanation of the decision.
    """

    lease_id: int
    org_id: int
    unit_id: int
    previous_status: str
    start_date: str
    end_date: Optional[str]
    active_by_dates: bool
    party_count: int
    primary_count: int
    action: str
    reason: str

    def to_dict(self) -> dict:
        """Return the candidate as a serializable dictionary.

        Returns:
            dict: Plain dictionary representation.
        """
        # Step 1: Convert dataclass to dictionary
        return asdict(self)


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease is active on a given day.

    Lease semantics are treated as [start_date, end_date).

    Args:
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None for open-ended leases.
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


class Command(BaseCommand):
    """Repair stale lease status rows in a narrow, production-safe way.

    This command only repairs leases that are clearly stale under the
    system's end-exclusive interval semantics:

        status == ACTIVE
        and end_date is not None
        and end_date <= today

    Those rows are no longer active by date and can safely be moved to ENDED.

    This command intentionally does NOT auto-fix:
    - leases with no parties
    - leases missing a primary tenant
    - leases marked ENDED but still active by dates

    Examples:
        python manage.py repair_lease_status_integrity --dry-run
        python manage.py repair_lease_status_integrity --apply
        python manage.py repair_lease_status_integrity --org-id 2 --dry-run
        python manage.py repair_lease_status_integrity --lease-id 11 --apply
        python manage.py repair_lease_status_integrity --json --dry-run
    """

    help = (
        "Repair stale ACTIVE lease statuses when end_date is today or in the past. "
        "Default mode is dry-run unless --apply is provided."
    )

    def add_arguments(self, parser) -> None:
        """Register CLI arguments."""
        # Step 1: Optional org scoping
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Restrict the repair scan to one organization ID.",
        )

        # Step 2: Optional lease scoping
        parser.add_argument(
            "--lease-id",
            type=int,
            dest="lease_id",
            help="Restrict the repair scan to one lease ID.",
        )

        # Step 3: Explicit apply flag
        parser.add_argument(
            "--apply",
            action="store_true",
            dest="apply_changes",
            help="Actually persist safe repairs. Without this flag, the command is dry-run.",
        )

        # Step 4: Optional JSON output
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Output results as JSON.",
        )

    def handle(self, *args, **options) -> None:
        """Execute the repair command."""
        # Step 1: Resolve runtime options
        today = timezone.localdate()
        org_id = options.get("org_id")
        lease_id = options.get("lease_id")
        apply_changes = options.get("apply_changes", False)
        as_json = options.get("as_json", False)

        # Step 2: Build the candidate queryset
        queryset = Lease.objects.select_related("organization", "unit").prefetch_related("parties")

        if org_id is not None:
            queryset = queryset.filter(organization_id=org_id)

        if lease_id is not None:
            queryset = queryset.filter(id=lease_id)

        leases = list(queryset.order_by("organization_id", "unit_id", "start_date", "id"))

        if not leases:
            self.stdout.write(self.style.WARNING("No leases found for the provided filters."))
            return

        # Step 3: Evaluate each lease and classify the action
        candidates: list[RepairCandidate] = []
        lease_ids_to_update: list[int] = []

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

            action = "skip"
            reason = "Lease does not match a safe automatic repair rule."

            # Step 4: Safe repair rule
            if (
                lease.status == Lease.Status.ACTIVE
                and lease.end_date is not None
                and lease.end_date <= today
            ):
                action = "repair_status_to_ended"
                reason = (
                    "Lease is marked ACTIVE, but its end_date is today or in the past "
                    "under end-exclusive semantics."
                )
                lease_ids_to_update.append(lease.id)

            # Step 5: Explicitly classify risky rows we intentionally skip
            elif lease.status == Lease.Status.ENDED and active_by_dates:
                action = "skip_manual_review"
                reason = (
                    "Lease is marked ENDED but still appears active by dates. "
                    "This may reflect an incorrect status, incorrect end_date, or an intentional early termination."
                )

            elif party_count == 0:
                action = "skip_manual_review"
                reason = (
                    "Lease has no LeaseTenant rows. Status repair alone would not restore historical tenancy integrity."
                )

            elif primary_count != 1:
                action = "skip_manual_review"
                reason = (
                    "Lease does not resolve to exactly one primary tenant. This requires business review."
                )

            candidates.append(
                RepairCandidate(
                    lease_id=lease.id,
                    org_id=lease.organization_id,
                    unit_id=lease.unit_id,
                    previous_status=lease.status,
                    start_date=str(lease.start_date),
                    end_date=str(lease.end_date) if lease.end_date else None,
                    active_by_dates=active_by_dates,
                    party_count=party_count,
                    primary_count=primary_count,
                    action=action,
                    reason=reason,
                )
            )

        # Step 6: Persist only the safe repairs when --apply is provided
        updated_count = 0
        updated_lease_ids: list[int] = []

        if apply_changes and lease_ids_to_update:
            with transaction.atomic():
                leases_to_update = list(
                    Lease.objects.filter(id__in=lease_ids_to_update).order_by("id")
                )

                for lease in leases_to_update:
                    lease.status = Lease.Status.ENDED
                    lease.save(update_fields=["status", "updated_at"])
                    updated_count += 1
                    updated_lease_ids.append(lease.id)

        # Step 7: Support JSON output
        if as_json:
            payload = {
                "evaluated_on": str(today),
                "dry_run": not apply_changes,
                "scoped_org_id": org_id,
                "scoped_lease_id": lease_id,
                "total_leases_evaluated": len(candidates),
                "safe_repair_candidate_count": len(lease_ids_to_update),
                "updated_count": updated_count,
                "updated_lease_ids": updated_lease_ids,
                "rows": [candidate.to_dict() for candidate in candidates],
            }
            self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
            return

        # Step 8: Print summary header
        mode_label = "APPLY" if apply_changes else "DRY-RUN"

        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.HTTP_INFO("LEASE STATUS INTEGRITY REPAIR"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"Mode: {mode_label}")
        self.stdout.write(f"Evaluated on: {today}")
        self.stdout.write(f"Organization filter: {org_id if org_id is not None else 'ALL'}")
        self.stdout.write(f"Lease filter: {lease_id if lease_id is not None else 'ALL'}")
        self.stdout.write("")

        # Step 9: Print safe repair candidates
        safe_candidates = [
            candidate
            for candidate in candidates
            if candidate.action == "repair_status_to_ended"
        ]
        manual_review_candidates = [
            candidate
            for candidate in candidates
            if candidate.action == "skip_manual_review"
        ]

        self.stdout.write(f"Total leases evaluated: {len(candidates)}")
        self.stdout.write(f"Safe repair candidates: {len(safe_candidates)}")
        self.stdout.write(f"Manual review rows: {len(manual_review_candidates)}")
        self.stdout.write(f"Updated rows: {updated_count}")
        self.stdout.write("")

        if safe_candidates:
            self.stdout.write("-" * 80)
            self.stdout.write(self.style.WARNING("SAFE REPAIR CANDIDATES"))
            self.stdout.write("-" * 80)

            for candidate in safe_candidates:
                self.stdout.write(
                    f"lease_id={candidate.lease_id} | org_id={candidate.org_id} | "
                    f"unit_id={candidate.unit_id} | "
                    f"status={candidate.previous_status} | "
                    f"start_date={candidate.start_date} | "
                    f"end_date={candidate.end_date} | "
                    f"party_count={candidate.party_count} | "
                    f"primary_count={candidate.primary_count}"
                )
                self.stdout.write(f"reason={candidate.reason}")
                self.stdout.write("")

        # Step 10: Print manual review rows separately
        if manual_review_candidates:
            self.stdout.write("-" * 80)
            self.stdout.write(self.style.WARNING("MANUAL REVIEW REQUIRED"))
            self.stdout.write("-" * 80)

            for candidate in manual_review_candidates:
                self.stdout.write(
                    f"lease_id={candidate.lease_id} | org_id={candidate.org_id} | "
                    f"unit_id={candidate.unit_id} | "
                    f"status={candidate.previous_status} | "
                    f"start_date={candidate.start_date} | "
                    f"end_date={candidate.end_date} | "
                    f"active_by_dates={candidate.active_by_dates} | "
                    f"party_count={candidate.party_count} | "
                    f"primary_count={candidate.primary_count}"
                )
                self.stdout.write(f"reason={candidate.reason}")
                self.stdout.write("")

        # Step 11: Print final summary line
        if apply_changes:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Repair completed. Updated {updated_count} lease status row(s)."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Dry-run completed. Re-run with --apply to persist safe repairs."
                )
            )
