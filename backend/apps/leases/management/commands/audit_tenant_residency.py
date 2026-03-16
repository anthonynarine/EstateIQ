# Filename: backend/apps/leases/management/commands/audit_tenant_residency.py

import json
from collections import Counter, defaultdict
from typing import Any

from django.core.management.base import BaseCommand, CommandError

from apps.core.models import Organization
from apps.leases.audit.tenant_residency import audit_tenant_residency_integrity
from apps.leases.models import Tenant


class Command(BaseCommand):
    """Audit tenant residency integrity for one org or all orgs.

    This command is read-only. It scans tenant residency relationships and
    reports anomalies that could cause the tenant read model to become
    misleading or incorrect.

    By default, low-signal development noise such as tenants with no lease
    history is hidden from the printed report. Use --include-empty-history
    when you explicitly want to see those findings.
    """

    help = "Audit tenant residency integrity across one organization or all organizations."

    SEVERITY_ORDER = {
        "low": 1,
        "medium": 2,
        "high": 3,
    }

    def add_arguments(self, parser) -> None:
        """Register command-line arguments.

        Args:
            parser: Django command parser.
        """
        # Step 1: Optional org scoping
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Audit a single organization by ID.",
        )

        # Step 2: Optional tenant narrowing
        parser.add_argument(
            "--tenant-id",
            type=int,
            dest="tenant_id",
            help="Audit a single tenant within the selected org scope.",
        )

        # Step 3: Optional active-only filtering
        parser.add_argument(
            "--only-active",
            action="store_true",
            dest="only_active",
            help="Only scan tenants who resolve to an active lease today.",
        )

        # Step 4: Optional limit for detailed output
        parser.add_argument(
            "--limit",
            type=int,
            dest="limit",
            default=None,
            help="Limit the number of detailed findings printed after filtering.",
        )

        # Step 5: Optional JSON output
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Print the filtered report as JSON.",
        )

        # Step 6: Optional inclusion of empty-history findings
        parser.add_argument(
            "--include-empty-history",
            action="store_true",
            dest="include_empty_history",
            help="Include tenant_has_no_lease_history findings in output.",
        )

        # Step 7: Optional minimum severity filter
        parser.add_argument(
            "--min-severity",
            type=str,
            dest="min_severity",
            default="low",
            help="Minimum severity to display: low, medium, or high. Defaults to low.",
        )

    def handle(self, *args, **options) -> None:
        """Run the tenant residency audit command.

        Args:
            *args: Positional command args.
            **options: Parsed command options.

        Raises:
            CommandError: If invalid argument combinations are provided.
        """
        org_id = options["org_id"]
        tenant_id = options["tenant_id"]
        only_active = options["only_active"]
        limit = options["limit"]
        as_json = options["as_json"]
        include_empty_history = options["include_empty_history"]
        min_severity = self._normalize_min_severity(options["min_severity"])

        # Step 1: Guard invalid argument combinations
        if tenant_id is not None and org_id is None:
            raise CommandError("--tenant-id requires --org-id.")

        if limit is not None and limit <= 0:
            raise CommandError("--limit must be greater than 0.")

        # Step 2: Validate requested org/tenant scope before running the audit
        self._validate_scope(
            org_id=org_id,
            tenant_id=tenant_id,
        )

        # Step 3: Execute the shared audit service
        report = audit_tenant_residency_integrity(
            org_id=org_id,
            tenant_id=tenant_id,
            only_active=only_active,
        )

        # Step 4: Apply presentation-level filtering to keep output high-signal
        filtered_issues = self._filter_issues(
            issues=report.issues,
            include_empty_history=include_empty_history,
            min_severity=min_severity,
        )
        limited_issues = filtered_issues[:limit] if limit is not None else filtered_issues

        # Step 5: Emit JSON when requested
        if as_json:
            self.stdout.write(
                json.dumps(
                    self._build_json_payload(
                        report=report,
                        filtered_issues=filtered_issues,
                        returned_issues=limited_issues,
                        only_active=only_active,
                        include_empty_history=include_empty_history,
                        min_severity=min_severity,
                        limit=limit,
                    ),
                    indent=2,
                    sort_keys=True,
                )
            )
            return

        # Step 6: Otherwise render human-readable output
        self._print_human_report(
            report=report,
            filtered_issues=filtered_issues,
            returned_issues=limited_issues,
            only_active=only_active,
            include_empty_history=include_empty_history,
            min_severity=min_severity,
            limit=limit,
        )

    def _normalize_min_severity(self, value: str) -> str:
        """Normalize and validate the minimum severity argument.

        Args:
            value: Raw severity string from the CLI.

        Returns:
            str: Normalized lowercase severity value.

        Raises:
            CommandError: If the supplied severity is invalid.
        """
        # Step 1: Normalize the input once
        normalized = (value or "").strip().lower()

        # Step 2: Validate the allowed values
        if normalized not in self.SEVERITY_ORDER:
            raise CommandError(
                "--min-severity must be one of: low, medium, high."
            )

        return normalized

    def _validate_scope(
        self,
        *,
        org_id: int | None,
        tenant_id: int | None,
    ) -> None:
        """Validate organization and tenant scope arguments.

        Args:
            org_id: Optional organization ID filter.
            tenant_id: Optional tenant ID filter.

        Raises:
            CommandError: If the requested org or tenant scope is invalid.
        """
        # Step 1: Validate the organization if one was explicitly requested
        if org_id is not None and not Organization.objects.filter(id=org_id).exists():
            raise CommandError(f"Organization {org_id} does not exist.")

        # Step 2: Validate the tenant if one was explicitly requested
        if tenant_id is not None:
            tenant_exists = Tenant.objects.filter(
                organization_id=org_id,
                id=tenant_id,
            ).exists()

            if not tenant_exists:
                raise CommandError(
                    f"Tenant {tenant_id} was not found in organization {org_id}."
                )

    def _filter_issues(
        self,
        *,
        issues: list[Any],
        include_empty_history: bool,
        min_severity: str,
    ) -> list[Any]:
        """Filter issues for display/JSON output.

        Args:
            issues: Full issue list returned by the audit service.
            include_empty_history: Whether to include empty-history findings.
            min_severity: Minimum severity to include.

        Returns:
            list[Any]: Filtered issue list.
        """
        # Step 1: Resolve the minimum severity threshold
        minimum_rank = self.SEVERITY_ORDER[min_severity]

        filtered: list[Any] = []

        # Step 2: Apply output-level filters in one pass
        for issue in issues:
            issue_severity = (issue.severity or "").lower()
            issue_rank = self.SEVERITY_ORDER.get(issue_severity, 0)

            if issue_rank < minimum_rank:
                continue

            if (
                not include_empty_history
                and issue.code == "tenant_has_no_lease_history"
            ):
                continue

            filtered.append(issue)

        return filtered

    def _build_json_payload(
        self,
        *,
        report,
        filtered_issues: list[Any],
        returned_issues: list[Any],
        only_active: bool,
        include_empty_history: bool,
        min_severity: str,
        limit: int | None,
    ) -> dict[str, Any]:
        """Build a JSON-safe representation of the audit report.

        Args:
            report: AuditReport returned by the audit service.
            filtered_issues: Issues after command-level filtering.
            returned_issues: Final issue list after filtering and limit.
            only_active: Whether the audit was scoped to active tenants only.
            include_empty_history: Whether empty-history findings were included.
            min_severity: Minimum severity used for filtering.
            limit: Optional cap for the returned issue list.

        Returns:
            dict[str, Any]: JSON-safe report payload.
        """
        # Step 1: Build summary counters for both raw and filtered output
        raw_severity_counts = Counter(
            issue.severity.upper() for issue in report.issues
        )
        raw_code_counts = Counter(issue.code for issue in report.issues)

        filtered_severity_counts = Counter(
            issue.severity.upper() for issue in filtered_issues
        )
        filtered_code_counts = Counter(issue.code for issue in filtered_issues)

        # Step 2: Return a structured payload
        return {
            "evaluated_on": str(report.evaluated_on),
            "org_ids": report.org_ids,
            "filters": {
                "only_active": only_active,
                "include_empty_history": include_empty_history,
                "min_severity": min_severity,
                "limit": limit,
            },
            "summary": {
                "raw_total_findings": len(report.issues),
                "filtered_total_findings": len(filtered_issues),
                "returned_findings": len(returned_issues),
                "raw_severity_counts": dict(raw_severity_counts),
                "raw_code_counts": dict(raw_code_counts),
                "filtered_severity_counts": dict(filtered_severity_counts),
                "filtered_code_counts": dict(filtered_code_counts),
            },
            "issues": [issue.to_dict() for issue in returned_issues],
        }

    def _print_human_report(
        self,
        *,
        report,
        filtered_issues: list[Any],
        returned_issues: list[Any],
        only_active: bool,
        include_empty_history: bool,
        min_severity: str,
        limit: int | None,
    ) -> None:
        """Render the audit report in a human-readable format.

        Args:
            report: AuditReport returned by the audit service.
            filtered_issues: Issues after command-level filtering.
            returned_issues: Final issue list after filtering and limit.
            only_active: Whether the audit was scoped to active tenants only.
            include_empty_history: Whether empty-history findings were included.
            min_severity: Minimum severity used for filtering.
            limit: Optional cap for the detailed finding list.
        """
        # Step 1: Build counters from the filtered issue set
        severity_counts = Counter(
            issue.severity.upper() for issue in filtered_issues
        )
        code_counts = Counter(issue.code for issue in filtered_issues)

        # Step 2: Print header
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("TENANT RESIDENCY AUDIT")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Evaluated on: {report.evaluated_on}")
        self.stdout.write(f"Organizations scanned: {report.org_ids}")
        self.stdout.write(f"Raw findings: {len(report.issues)}")
        self.stdout.write(f"Filtered findings: {len(filtered_issues)}")
        self.stdout.write(f"Returned findings: {len(returned_issues)}")
        self.stdout.write(f"Only active tenants: {only_active}")
        self.stdout.write(f"Include empty history: {include_empty_history}")
        self.stdout.write(f"Minimum severity: {min_severity.upper()}")

        if limit is not None:
            self.stdout.write(f"Limit applied: {limit}")

        self.stdout.write("")

        # Step 3: Print severity summary
        self.stdout.write("Summary by severity")
        for severity in ("HIGH", "MEDIUM", "LOW"):
            self.stdout.write(f"  {severity}: {severity_counts.get(severity, 0)}")

        self.stdout.write("")

        # Step 4: Print code summary
        self.stdout.write("Summary by code")
        if code_counts:
            for code, count in sorted(
                code_counts.items(),
                key=lambda item: (-item[1], item[0]),
            ):
                self.stdout.write(f"  {code}: {count}")
        else:
            self.stdout.write("  No findings.")

        self.stdout.write("")
        self.stdout.write("Detailed findings")
        self.stdout.write("")

        # Step 5: Print grouped detailed findings
        if not returned_issues:
            self.stdout.write("No findings detected.")
            self.stdout.write("")
            return

        issues_by_severity: dict[str, list[Any]] = defaultdict(list)
        for issue in returned_issues:
            issues_by_severity[issue.severity.upper()].append(issue)

        for severity in ("HIGH", "MEDIUM", "LOW"):
            severity_issues = issues_by_severity.get(severity, [])
            if not severity_issues:
                continue

            self.stdout.write(f"[{severity}]")
            self.stdout.write("-" * 80)

            for issue in severity_issues:
                self._print_issue(issue)

    def _print_issue(self, issue) -> None:
        """Render one detailed audit finding.

        Args:
            issue: AuditIssue instance.
        """
        payload = issue.payload or {}

        tenant_id = payload.get("tenant_id")
        lease_id = payload.get("lease_id")
        lease_tenant_id = payload.get("lease_tenant_id")
        unit_id = payload.get("unit_id")
        building_id = payload.get("building_id")

        context_parts: list[str] = []

        # Step 1: Build a compact context line
        if tenant_id is not None:
            context_parts.append(f"tenant={tenant_id}")

        if lease_id is not None:
            context_parts.append(f"lease={lease_id}")

        if lease_tenant_id is not None:
            context_parts.append(f"lease_tenant={lease_tenant_id}")

        if unit_id is not None:
            context_parts.append(f"unit={unit_id}")

        if building_id is not None:
            context_parts.append(f"building={building_id}")

        self.stdout.write(
            f"{issue.code} | severity={issue.severity.upper()} | org={issue.org_id}"
        )
        self.stdout.write(issue.message)

        if context_parts:
            self.stdout.write(f"Context: {' | '.join(context_parts)}")

        # Step 2: Print the payload in stable order
        for key, value in sorted(payload.items(), key=lambda item: item[0]):
            self.stdout.write(f"  - {key}: {value}")

        self.stdout.write("")