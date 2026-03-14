# Filename: backend/apps/leases/management/commands/audit_lease_history.py

from __future__ import annotations

import json

from django.core.management.base import BaseCommand

from apps.leases.audit import audit_lease_history_integrity


class Command(BaseCommand):
    """Run a read-only audit of lease history integrity.

    This command is safe to run in development, staging, and production.
    It does not mutate data.

    Examples:
        python manage.py audit_lease_history
        python manage.py audit_lease_history --org-id 12
        python manage.py audit_lease_history --org-id 12 --json
    """

    help = "Audit lease history integrity for leases, lease parties, tenants, and occupancy."

    def add_arguments(self, parser) -> None:
        """Register CLI arguments."""
        # Step 1: Optional org scoping
        parser.add_argument(
            "--org-id",
            type=int,
            dest="org_id",
            help="Audit only one organization ID.",
        )

        # Step 2: Optional machine-readable JSON output
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Output the audit report as JSON.",
        )

    def handle(self, *args, **options) -> None:
        """Execute the lease history audit."""
        # Step 1: Run the shared audit service
        report = audit_lease_history_integrity(
            org_id=options.get("org_id"),
        )

        # Step 2: Support JSON output for scripts and tooling
        if options.get("as_json"):
            payload = {
                "evaluated_on": str(report.evaluated_on),
                "org_ids": report.org_ids,
                "issue_count": report.issue_count,
                "summary_by_code": report.summary_by_code(),
                "summary_by_severity": report.summary_by_severity(),
                "issues": [issue.to_dict() for issue in report.issues],
            }
            self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
            return

        # Step 3: Print a human-friendly header
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.HTTP_INFO("LEASE HISTORY AUDIT"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"Evaluated on: {report.evaluated_on}")
        self.stdout.write(f"Organizations: {report.org_ids if report.org_ids else '[]'}")
        self.stdout.write("")

        # Step 4: Exit early if no issues were found
        if not report.has_issues:
            self.stdout.write(self.style.SUCCESS("No issues found."))
            return

        # Step 5: Print summary counts first
        self.stdout.write("Summary by severity:")
        for severity, count in sorted(report.summary_by_severity().items()):
            self.stdout.write(f"  - {severity}: {count}")

        self.stdout.write("")
        self.stdout.write("Summary by code:")
        for code, count in sorted(report.summary_by_code().items()):
            self.stdout.write(f"  - {code}: {count}")

        # Step 6: Group detailed findings by code
        issues_by_code: dict[str, list] = {}
        for issue in report.issues:
            issues_by_code.setdefault(issue.code, []).append(issue)

        self.stdout.write("")
        for code, issues in sorted(issues_by_code.items()):
            self.stdout.write("-" * 80)
            self.stdout.write(self.style.WARNING(f"{code} ({len(issues)})"))
            self.stdout.write("-" * 80)

            for issue in issues:
                self.stdout.write(
                    f"[{issue.severity.upper()}] org_id={issue.org_id} | {issue.message}"
                )
                self.stdout.write(f"payload={issue.payload}")
                self.stdout.write("")

        # Step 7: Print a final summary line
        self.stdout.write(
            self.style.WARNING(
                f"Audit completed with {report.issue_count} issue(s)."
            )
        )
