# Filename: backend/apps/leases/management/commands/inspect_tenant_history.py

import json
from typing import Any

from django.core.management.base import BaseCommand, CommandError

from apps.leases.audit.tenant_residency import inspect_tenant_history
from apps.leases.models import Tenant


class Command(BaseCommand):
    """Inspect one tenant's residency history in a human-readable way.

    This command is read-only and intended for surgical debugging.

    It prints:
        - tenant identity
        - derived current status
        - active lease summary, if one resolves cleanly
        - full linked lease history
        - anomalies found for that tenant
    """

    help = "Inspect a single tenant's residency history and derived current residency state."

    def add_arguments(self, parser) -> None:
        """Register command-line arguments.

        Args:
            parser: Django command parser.
        """
        # Step 1: Require org scope for strict tenant-boundary inspection
        parser.add_argument(
            "--org-id",
            type=int,
            required=True,
            dest="org_id",
            help="Organization ID that owns the tenant.",
        )

        # Step 2: Require tenant ID so the command stays surgical
        parser.add_argument(
            "--tenant-id",
            type=int,
            required=True,
            dest="tenant_id",
            help="Tenant ID to inspect.",
        )

        # Step 3: Allow JSON output for tooling/debugging reuse
        parser.add_argument(
            "--json",
            action="store_true",
            dest="as_json",
            help="Print the inspection result as JSON.",
        )

    def handle(self, *args, **options) -> None:
        """Run the tenant history inspection command.

        Args:
            *args: Positional command args.
            **options: Parsed command options.

        Raises:
            CommandError: If the tenant does not exist in the requested org.
        """
        org_id = options["org_id"]
        tenant_id = options["tenant_id"]
        as_json = options["as_json"]

        # Step 1: Validate that the tenant exists inside the requested org
        tenant = (
            Tenant.objects.filter(
                organization_id=org_id,
                id=tenant_id,
            )
            .only(
                "id",
                "organization_id",
            )
            .first()
        )

        if tenant is None:
            raise CommandError(
                f"Tenant {tenant_id} was not found in organization {org_id}."
            )

        # Step 2: Build the structured inspection snapshot
        inspection = inspect_tenant_history(
            org_id=org_id,
            tenant_id=tenant_id,
        )

        # Step 3: Emit JSON when requested
        if as_json:
            self.stdout.write(
                json.dumps(
                    self._build_json_payload(inspection=inspection),
                    indent=2,
                    sort_keys=True,
                )
            )
            return

        # Step 4: Otherwise render human-readable debugging output
        self._print_human_report(inspection=inspection)

    def _build_json_payload(self, *, inspection) -> dict[str, Any]:
        """Build a JSON-safe inspection payload.

        Args:
            inspection: TenantHistoryInspection returned by the audit service.

        Returns:
            dict[str, Any]: JSON-safe representation.
        """
        # Step 1: Reuse the service's structured serializer
        return inspection.to_dict()

    def _print_human_report(self, *, inspection) -> None:
        """Render a human-readable tenant history report.

        Args:
            inspection: TenantHistoryInspection returned by the audit service.
        """
        issues = inspection.issues
        lease_history = inspection.lease_history

        # Step 1: Print header
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("TENANT HISTORY INSPECTION")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Evaluated on: {inspection.evaluated_on}")
        self.stdout.write(f"Organization: {inspection.org_id}")
        self.stdout.write(f"Tenant ID: {inspection.tenant_id}")
        self.stdout.write(f"Tenant name: {inspection.tenant_name}")
        self.stdout.write(f"Email: {inspection.tenant_email or '—'}")
        self.stdout.write(f"Phone: {inspection.tenant_phone or '—'}")
        self.stdout.write("")

        # Step 2: Print derived current status
        self.stdout.write("-" * 80)
        self.stdout.write("DERIVED CURRENT STATUS")
        self.stdout.write("-" * 80)
        self.stdout.write(f"Derived status: {inspection.derived_status}")

        if inspection.active_lease_id is not None:
            self.stdout.write(f"Active lease ID: {inspection.active_lease_id}")
            self.stdout.write(
                f"Active unit: {inspection.active_lease_unit_label or '—'}"
            )
            self.stdout.write(
                f"Active building: {inspection.active_lease_building_name or '—'}"
            )
        else:
            self.stdout.write("Active lease ID: —")
            self.stdout.write("Active unit: —")
            self.stdout.write("Active building: —")

        self.stdout.write("")

        # Step 3: Print linked lease timeline
        self.stdout.write("-" * 80)
        self.stdout.write("LEASE HISTORY")
        self.stdout.write("-" * 80)

        if not lease_history:
            self.stdout.write("No linked lease history.")
            self.stdout.write("")
        else:
            for row in lease_history:
                self._print_history_row(row)

        # Step 4: Print anomaly summary
        self.stdout.write("-" * 80)
        self.stdout.write("ANOMALIES")
        self.stdout.write("-" * 80)

        if not issues:
            self.stdout.write("No anomalies detected.")
            self.stdout.write("")
            return

        for issue in issues:
            self._print_issue(issue)

        self.stdout.write("")

    def _print_history_row(self, row) -> None:
        """Render one lease-history row.

        Args:
            row: TenantLeaseHistoryRow dataclass instance.
        """
        active_label = "YES" if row.is_active_today else "NO"

        # Step 1: Print the lease-history block
        self.stdout.write(
            f"Lease {row.lease_id} | "
            f"LeaseTenant {row.lease_tenant_id} | "
            f"Role={row.role} | "
            f"Status={row.lease_status} | "
            f"ActiveToday={active_label}"
        )
        self.stdout.write(
            f"  Dates: {row.start_date} -> {row.end_date or 'open-ended'}"
        )
        self.stdout.write(
            f"  Unit: {row.unit_label or '—'} "
            f"(id={row.unit_id if row.unit_id is not None else '—'})"
        )
        self.stdout.write(
            f"  Building: {row.building_name or '—'} "
            f"(id={row.building_id if row.building_id is not None else '—'})"
        )
        self.stdout.write("")

    def _print_issue(self, issue) -> None:
        """Render one audit issue.

        Args:
            issue: AuditIssue instance.
        """
        payload = issue.payload or {}

        # Step 1: Print the main issue line
        self.stdout.write(
            f"{issue.code} | severity={issue.severity.upper()} | org={issue.org_id}"
        )
        self.stdout.write(issue.message)

        # Step 2: Print sorted payload fields for stable debugging output
        for key, value in sorted(payload.items(), key=lambda item: item[0]):
            self.stdout.write(f"  - {key}: {value}")

        self.stdout.write("")