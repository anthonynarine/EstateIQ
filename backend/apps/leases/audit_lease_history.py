# Filename: backend/apps/leases/management/commands/audit_lease_history.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional

from django.core.management.base import BaseCommand
from django.db.models import Count, Prefetch, Q
from django.utils import timezone

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class Issue:
    """Represents one audit finding.

    Attributes:
        code: Stable machine-friendly issue code.
        org_id: Organization identifier for tenant-safe reporting.
        message: Human-readable explanation of the issue.
        payload: Extra context for debugging the problem later.
    """

    code: str
    org_id: int
    message: str
    payload: dict


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease interval is active on a given date.

    Lease semantics are treated as:

        [start_date, end_date)

    Args:
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None for open-ended.
        day: Date to evaluate.

    Returns:
        bool: True if the interval is active on the given day.
    """
    # Step 1: The lease cannot be active before it starts.
    if start_date > day:
        return False

    # Step 2: Open-ended leases remain active after start.
    if end_date is None:
        return True

    # Step 3: End date is exclusive.
    return end_date > day


def _intervals_overlap_end_exclusive(
    *,
    first_start: date,
    first_end: Optional[date],
    second_start: date,
    second_end: Optional[date],
) -> bool:
    """Return True if two lease intervals overlap under [start, end) semantics.

    Args:
        first_start: First interval inclusive start.
        first_end: First interval exclusive end, or None.
        second_start: Second interval inclusive start.
        second_end: Second interval exclusive end, or None.

    Returns:
        bool: True if the intervals overlap.
    """
    # Step 1: Evaluate the left comparison.
    left = True if first_end is None else second_start < first_end

    # Step 2: Evaluate the right comparison.
    right = True if second_end is None else second_end > first_start

    # Step 3: Intervals overlap only if both conditions hold.
    return left and right


class Command(BaseCommand):
    """Audit lease history integrity without mutating any data.

    This command is safe to run in development, staging, and production.

    It checks:
    - lease interval integrity
    - overlap integrity
    - lease-party integrity
    - org-boundary integrity
    - active occupancy consistency
    - history preservation assumptions

    Example usage:
        python manage.py audit_lease_history
        python manage.py audit_lease_history --org-id 12
    """

    help = "Audit lease history integrity for leases, lease parties, tenants, and occupancy."

    def add_arguments(self, parser) -> None:
        """Register command-line arguments."""
        # Step 1: Optional org filter for tenant-safe targeted audits.
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Audit only one organization by ID.",
        )

    def handle(self, *args, **options) -> None:
        """Run the lease history audit and print grouped findings."""
        # Step 1: Resolve target date once for deterministic results.
        today = timezone.localdate()

        # Step 2: Resolve which organizations to audit.
        org_id = options.get("org_id")
        if org_id:
            organizations = Organization.objects.filter(id=org_id)
        else:
            organizations = Organization.objects.all().order_by("id")

        if not organizations.exists():
            self.stdout.write(self.style.WARNING("No organizations found for audit."))
            return

        all_issues: list[Issue] = []

        # Step 3: Audit each organization independently.
        for org in organizations:
            org_issues = self._audit_organization(org=org, today=today)
            all_issues.extend(org_issues)

        # Step 4: Print a grouped summary and findings.
        self._print_report(issues=all_issues, today=today)

        # Step 5: Exit with a helpful final line.
        if all_issues:
            self.stdout.write(
                self.style.WARNING(
                    f"Lease history audit completed with {len(all_issues)} issue(s)."
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("Lease history audit passed with no issues."))

    def _audit_organization(self, *, org: Organization, today: date) -> list[Issue]:
        """Audit one organization for lease history integrity.

        Args:
            org: Organization to inspect.
            today: Evaluation date for active occupancy checks.

        Returns:
            list[Issue]: All findings for the organization.
        """
        # Step 1: Load the main datasets for this organization.
        leases = list(
            Lease.objects.filter(organization=org)
            .select_related("unit")
            .prefetch_related(
                Prefetch(
                    "parties",
                    queryset=LeaseTenant.objects.select_related("tenant").order_by("id"),
                )
            )
            .order_by("unit_id", "start_date", "id")
        )

        lease_ids = [lease.id for lease in leases]

        lease_tenants = list(
            LeaseTenant.objects.filter(organization=org)
            .select_related("lease", "tenant")
            .order_by("lease_id", "id")
        )

        units = list(
            Unit.objects.filter(organization=org)
            .order_by("building_id", "id")
        )

        issues: list[Issue] = []

        # Step 2: Run each audit section clearly.
        issues.extend(self._check_lease_date_sanity(org=org, leases=leases))
        issues.extend(self._check_overlap_integrity(org=org, leases=leases))
        issues.extend(self._check_party_integrity(org=org, leases=leases, lease_tenants=lease_tenants))
        issues.extend(self._check_cross_org_integrity(org=org, lease_tenants=lease_tenants))
        issues.extend(
            self._check_active_occupancy_integrity(
                org=org,
                today=today,
                units=units,
                leases=leases,
                lease_tenants=lease_tenants,
            )
        )
        issues.extend(self._check_history_retention(org=org, leases=leases, lease_ids=lease_ids))

        return issues

    def _check_lease_date_sanity(
        self,
        *,
        org: Organization,
        leases: Iterable[Lease],
    ) -> list[Issue]:
        """Check lease-level date sanity and org integrity."""
        issues: list[Issue] = []

        for lease in leases:
            # Step 1: Flag impossible date ranges.
            if lease.end_date is not None and lease.end_date <= lease.start_date:
                issues.append(
                    Issue(
                        code="invalid_date_range",
                        org_id=org.id,
                        message="Lease has end_date less than or equal to start_date.",
                        payload={
                            "lease_id": lease.id,
                            "unit_id": lease.unit_id,
                            "start_date": str(lease.start_date),
                            "end_date": str(lease.end_date),
                            "status": lease.status,
                        },
                    )
                )

            # Step 2: Flag cross-org unit mismatches.
            if lease.unit.organization_id != org.id:
                issues.append(
                    Issue(
                        code="lease_unit_org_mismatch",
                        org_id=org.id,
                        message="Lease unit belongs to a different organization.",
                        payload={
                            "lease_id": lease.id,
                            "lease_org_id": org.id,
                            "unit_id": lease.unit_id,
                            "unit_org_id": lease.unit.organization_id,
                        },
                    )
                )

        return issues

    def _check_overlap_integrity(
        self,
        *,
        org: Organization,
        leases: Iterable[Lease],
    ) -> list[Issue]:
        """Check for overlapping lease intervals on the same unit."""
        issues: list[Issue] = []

        # Step 1: Group leases by unit.
        leases_by_unit: dict[int, list[Lease]] = {}
        for lease in leases:
            leases_by_unit.setdefault(lease.unit_id, []).append(lease)

        # Step 2: Compare each pair within the same unit.
        for unit_id, unit_leases in leases_by_unit.items():
            sorted_leases = sorted(unit_leases, key=lambda item: (item.start_date, item.id))

            for index, current in enumerate(sorted_leases):
                for other in sorted_leases[index + 1 :]:
                    if _intervals_overlap_end_exclusive(
                        first_start=current.start_date,
                        first_end=current.end_date,
                        second_start=other.start_date,
                        second_end=other.end_date,
                    ):
                        issues.append(
                            Issue(
                                code="overlapping_leases_same_unit",
                                org_id=org.id,
                                message="Two leases overlap on the same unit under end-exclusive semantics.",
                                payload={
                                    "unit_id": unit_id,
                                    "first_lease": {
                                        "lease_id": current.id,
                                        "start_date": str(current.start_date),
                                        "end_date": str(current.end_date) if current.end_date else None,
                                        "status": current.status,
                                    },
                                    "second_lease": {
                                        "lease_id": other.id,
                                        "start_date": str(other.start_date),
                                        "end_date": str(other.end_date) if other.end_date else None,
                                        "status": other.status,
                                    },
                                    "rule": "[start_date, end_date)",
                                },
                            )
                        )

        return issues

    def _check_party_integrity(
        self,
        *,
        org: Organization,
        leases: Iterable[Lease],
        lease_tenants: Iterable[LeaseTenant],
    ) -> list[Issue]:
        """Check lease-party cardinality and duplicate party rows."""
        issues: list[Issue] = []

        # Step 1: Build party lists by lease.
        parties_by_lease: dict[int, list[LeaseTenant]] = {}
        for link in lease_tenants:
            parties_by_lease.setdefault(link.lease_id, []).append(link)

        # Step 2: Validate each lease's party structure.
        for lease in leases:
            parties = parties_by_lease.get(lease.id, [])
            primary_count = sum(1 for party in parties if party.role == LeaseTenant.Role.PRIMARY)

            if not parties:
                issues.append(
                    Issue(
                        code="lease_has_no_parties",
                        org_id=org.id,
                        message="Lease has no LeaseTenant rows.",
                        payload={"lease_id": lease.id, "unit_id": lease.unit_id, "status": lease.status},
                    )
                )

            if primary_count != 1:
                issues.append(
                    Issue(
                        code="invalid_primary_tenant_count",
                        org_id=org.id,
                        message="Lease does not have exactly one primary tenant.",
                        payload={
                            "lease_id": lease.id,
                            "unit_id": lease.unit_id,
                            "primary_count": primary_count,
                            "party_count": len(parties),
                        },
                    )
                )

            seen_tenant_ids: set[int] = set()
            duplicate_tenant_ids: set[int] = set()
            for party in parties:
                if party.tenant_id in seen_tenant_ids:
                    duplicate_tenant_ids.add(party.tenant_id)
                seen_tenant_ids.add(party.tenant_id)

            if duplicate_tenant_ids:
                issues.append(
                    Issue(
                        code="duplicate_tenant_per_lease",
                        org_id=org.id,
                        message="The same tenant appears more than once on a lease.",
                        payload={
                            "lease_id": lease.id,
                            "tenant_ids": sorted(duplicate_tenant_ids),
                        },
                    )
                )

        return issues

    def _check_cross_org_integrity(
        self,
        *,
        org: Organization,
        lease_tenants: Iterable[LeaseTenant],
    ) -> list[Issue]:
        """Check for cross-organization mismatches on LeaseTenant rows."""
        issues: list[Issue] = []

        for link in lease_tenants:
            # Step 1: Compare row org to lease org.
            if link.lease.organization_id != org.id:
                issues.append(
                    Issue(
                        code="lease_tenant_lease_org_mismatch",
                        org_id=org.id,
                        message="LeaseTenant row points to a lease in another organization.",
                        payload={
                            "lease_tenant_id": link.id,
                            "link_org_id": org.id,
                            "lease_id": link.lease_id,
                            "lease_org_id": link.lease.organization_id,
                        },
                    )
                )

            # Step 2: Compare row org to tenant org.
            if link.tenant.organization_id != org.id:
                issues.append(
                    Issue(
                        code="lease_tenant_tenant_org_mismatch",
                        org_id=org.id,
                        message="LeaseTenant row points to a tenant in another organization.",
                        payload={
                            "lease_tenant_id": link.id,
                            "link_org_id": org.id,
                            "tenant_id": link.tenant_id,
                            "tenant_org_id": link.tenant.organization_id,
                        },
                    )
                )

            # Step 3: Compare lease org and tenant org directly.
            if link.lease.organization_id != link.tenant.organization_id:
                issues.append(
                    Issue(
                        code="lease_and_tenant_org_mismatch",
                        org_id=org.id,
                        message="LeaseTenant links a lease and tenant across different organizations.",
                        payload={
                            "lease_tenant_id": link.id,
                            "lease_id": link.lease_id,
                            "lease_org_id": link.lease.organization_id,
                            "tenant_id": link.tenant_id,
                            "tenant_org_id": link.tenant.organization_id,
                        },
                    )
                )

        return issues

    def _check_active_occupancy_integrity(
        self,
        *,
        org: Organization,
        today: date,
        units: Iterable[Unit],
        leases: Iterable[Lease],
        lease_tenants: Iterable[LeaseTenant],
    ) -> list[Issue]:
        """Check occupancy integrity derived from active leases."""
        issues: list[Issue] = []

        # Step 1: Group leases and parties for efficient lookups.
        active_leases_by_unit: dict[int, list[Lease]] = {}
        for lease in leases:
            if (
                lease.status == Lease.Status.ACTIVE
                and _is_active_on_day(
                    start_date=lease.start_date,
                    end_date=lease.end_date,
                    day=today,
                )
            ):
                active_leases_by_unit.setdefault(lease.unit_id, []).append(lease)

        parties_by_lease: dict[int, list[LeaseTenant]] = {}
        for link in lease_tenants:
            parties_by_lease.setdefault(link.lease_id, []).append(link)

        # Step 2: Check each unit's active occupancy state.
        for unit in units:
            active_leases = active_leases_by_unit.get(unit.id, [])

            if len(active_leases) > 1:
                issues.append(
                    Issue(
                        code="multiple_active_leases_today",
                        org_id=org.id,
                        message="Unit has more than one active lease today.",
                        payload={
                            "unit_id": unit.id,
                            "today": str(today),
                            "lease_ids": [lease.id for lease in active_leases],
                        },
                    )
                )

            if len(active_leases) == 1:
                active_lease = active_leases[0]
                primary_count = sum(
                    1
                    for party in parties_by_lease.get(active_lease.id, [])
                    if party.role == LeaseTenant.Role.PRIMARY
                )

                if primary_count != 1:
                    issues.append(
                        Issue(
                            code="active_lease_missing_primary",
                            org_id=org.id,
                            message="Unit is occupied by an active lease but does not resolve to exactly one primary tenant.",
                            payload={
                                "unit_id": unit.id,
                                "lease_id": active_lease.id,
                                "today": str(today),
                                "primary_count": primary_count,
                            },
                        )
                    )

        # Step 3: Detect status/date drift for leases.
        for lease in leases:
            is_active_by_dates = _is_active_on_day(
                start_date=lease.start_date,
                end_date=lease.end_date,
                day=today,
            )

            if lease.status == Lease.Status.ACTIVE and lease.end_date is not None and lease.end_date <= today:
                issues.append(
                    Issue(
                        code="lease_status_active_but_ended_by_date",
                        org_id=org.id,
                        message="Lease is marked ACTIVE but its end_date is today or in the past.",
                        payload={
                            "lease_id": lease.id,
                            "unit_id": lease.unit_id,
                            "today": str(today),
                            "start_date": str(lease.start_date),
                            "end_date": str(lease.end_date),
                        },
                    )
                )

            if lease.status == Lease.Status.ENDED and is_active_by_dates:
                issues.append(
                    Issue(
                        code="lease_status_ended_but_active_by_dates",
                        org_id=org.id,
                        message="Lease is marked ENDED but still looks active by date interval.",
                        payload={
                            "lease_id": lease.id,
                            "unit_id": lease.unit_id,
                            "today": str(today),
                            "start_date": str(lease.start_date),
                            "end_date": str(lease.end_date) if lease.end_date else None,
                        },
                    )
                )

        return issues

    def _check_history_retention(
        self,
        *,
        org: Organization,
        leases: Iterable[Lease],
        lease_ids: Iterable[int],
    ) -> list[Issue]:
        """Check that historical lease relationships still retain their tenant rows."""
        issues: list[Issue] = []

        ended_leases = [lease for lease in leases if lease.status == Lease.Status.ENDED]

        # Step 1: Count party rows for ended leases.
        ended_lease_ids = [lease.id for lease in ended_leases]
        ended_party_counts = {
            row["lease_id"]: row["count"]
            for row in (
                LeaseTenant.objects.filter(organization=org, lease_id__in=ended_lease_ids)
                .values("lease_id")
                .annotate(count=Count("id"))
            )
        }

        for lease in ended_leases:
            if ended_party_counts.get(lease.id, 0) == 0:
                issues.append(
                    Issue(
                        code="ended_lease_missing_parties",
                        org_id=org.id,
                        message="Ended lease has no LeaseTenant rows, which weakens historical reconstruction.",
                        payload={"lease_id": lease.id, "unit_id": lease.unit_id},
                    )
                )

        # Step 2: Check that tenants referenced by lease links still exist.
        linked_tenant_ids = set(
            LeaseTenant.objects.filter(organization=org, lease_id__in=lease_ids).values_list(
                "tenant_id", flat=True
            )
        )
        existing_tenant_ids = set(
            Tenant.objects.filter(organization=org, id__in=linked_tenant_ids).values_list("id", flat=True)
        )
        missing_tenant_ids = sorted(linked_tenant_ids - existing_tenant_ids)

        for tenant_id in missing_tenant_ids:
            issues.append(
                Issue(
                    code="historical_tenant_missing",
                    org_id=org.id,
                    message="A tenant referenced by lease history is missing from the tenant table.",
                    payload={"tenant_id": tenant_id},
                )
            )

        return issues

    def _print_report(self, *, issues: list[Issue], today: date) -> None:
        """Print a grouped audit report."""
        # Step 1: Print report header.
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("LEASE HISTORY AUDIT")
        self.stdout.write(f"Evaluation date: {today.isoformat()}")
        self.stdout.write("=" * 80)
        self.stdout.write("")

        if not issues:
            self.stdout.write(self.style.SUCCESS("No issues found."))
            return

        # Step 2: Group issues by code for readability.
        issues_by_code: dict[str, list[Issue]] = {}
        for issue in issues:
            issues_by_code.setdefault(issue.code, []).append(issue)

        # Step 3: Print summary counts first.
        self.stdout.write("Summary by issue type:")
        for code in sorted(issues_by_code.keys()):
            self.stdout.write(f"  - {code}: {len(issues_by_code[code])}")
        self.stdout.write("")

        # Step 4: Print full findings grouped by code.
        for code in sorted(issues_by_code.keys()):
            grouped = issues_by_code[code]
            self.stdout.write("-" * 80)
            self.stdout.write(self.style.WARNING(f"{code} ({len(grouped)})"))
            self.stdout.write("-" * 80)

            for issue in grouped:
                self.stdout.write(f"org_id={issue.org_id} | {issue.message}")
                self.stdout.write(f"payload={issue.payload}")
                self.stdout.write("")