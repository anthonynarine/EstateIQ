# Filename: backend/apps/demo_data/management/commands/seed_demo_portfolio.py

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.demo_data.seed_service import DemoSeedService


class Command(BaseCommand):
    """Run the current deterministic demo portfolio seed workflow."""

    help = (
        "Seed the demo PortfolioOS organization, owner, property footprint, "
        "tenant roster, lease history, billing history, and verification."
    )

    def handle(self, *args, **options) -> None:
        """Execute the demo seed command and print a readable summary."""
        # Step 1: announce the seed start
        self.stdout.write(
            self.style.NOTICE("Starting demo portfolio seed...")
        )

        # Step 2: run the orchestration service
        result = DemoSeedService.run()

        # Step 3: print the core success summary
        self.stdout.write(
            self.style.SUCCESS("Demo portfolio seed completed successfully.")
        )
        self.stdout.write(f"User ID: {result.user_id}")
        self.stdout.write(f"Organization ID: {result.organization_id}")
        self.stdout.write(f"Membership ID: {result.membership_id}")
        self.stdout.write(
            f"Buildings created/reconciled: {len(result.building_ids_by_code)}"
        )
        self.stdout.write(
            f"Units created/reconciled: {len(result.unit_ids_by_code)}"
        )
        self.stdout.write(
            f"Tenants created/reconciled: {len(result.tenant_ids_by_code)}"
        )
        self.stdout.write(
            f"Leases created/reconciled: {len(result.lease_ids_by_code)}"
        )
        self.stdout.write(f"Charges created: {result.charges_created}")
        self.stdout.write(f"Charges existing: {result.charges_existing}")
        self.stdout.write(f"Payments created: {result.payments_created}")
        self.stdout.write(f"Payments existing: {result.payments_existing}")

        # Step 4: print expense summary only when the current result supports it
        if hasattr(result, "expense_categories_created"):
            self.stdout.write(
                f"Expense categories created: {result.expense_categories_created}"
            )

        if hasattr(result, "expense_categories_existing"):
            self.stdout.write(
                f"Expense categories existing: {result.expense_categories_existing}"
            )

        if hasattr(result, "vendors_created"):
            self.stdout.write(f"Vendors created: {result.vendors_created}")

        if hasattr(result, "vendors_existing"):
            self.stdout.write(f"Vendors existing: {result.vendors_existing}")

        if hasattr(result, "expenses_created"):
            self.stdout.write(f"Expenses created: {result.expenses_created}")

        if hasattr(result, "expenses_existing"):
            self.stdout.write(f"Expenses existing: {result.expenses_existing}")

        # Step 5: print verification summary
        self.stdout.write("")
        if result.verification_passed:
            self.stdout.write(self.style.SUCCESS("Verification passed."))
        else:
            self.stdout.write(self.style.ERROR("Verification failed."))

        self.stdout.write("Verification checks:")
        for name, passed, details in result.verification_checks:
            status = "PASS" if passed else "FAIL"
            status_style = (
                self.style.SUCCESS(status)
                if passed
                else self.style.ERROR(status)
            )
            self.stdout.write(f"  - [{status_style}] {name}: {details}")

        # Step 6: print stable reference maps
        self.stdout.write("")
        self.stdout.write("Building codes:")
        for code, building_id in sorted(result.building_ids_by_code.items()):
            self.stdout.write(f"  - {code}: {building_id}")

        self.stdout.write("")
        self.stdout.write("Unit codes:")
        for code, unit_id in sorted(result.unit_ids_by_code.items()):
            self.stdout.write(f"  - {code}: {unit_id}")

        self.stdout.write("")
        self.stdout.write("Tenant codes:")
        for code, tenant_id in sorted(result.tenant_ids_by_code.items()):
            self.stdout.write(f"  - {code}: {tenant_id}")

        self.stdout.write("")
        self.stdout.write("Lease codes:")
        for code, lease_id in sorted(result.lease_ids_by_code.items()):
            self.stdout.write(f"  - {code}: {lease_id}")

        # Step 7: fail the command if verification fails
        if not result.verification_passed:
            raise CommandError(
                "Demo portfolio seed completed, but verification failed."
            )