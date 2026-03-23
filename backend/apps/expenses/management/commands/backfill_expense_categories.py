# Step 1: Import command dependencies.
from __future__ import annotations

from typing import Iterable

from django.core.management.base import BaseCommand, CommandError

from apps.core.models import Organization
from apps.expenses.default_categories import DEFAULT_EXPENSE_CATEGORIES
from apps.expenses.services.category_seed_service import (
    seed_default_expense_categories_for_organization,
)


class Command(BaseCommand):
    """Backfill default expense categories for legacy organizations.

    This command is safe to re-run because the underlying seed service uses
    org-scoped get_or_create behavior keyed by stable slugs.
    """

    help = (
        "Create missing default expense categories for organizations that "
        "predate the org-create expense category seeding signal."
    )

    def add_arguments(self, parser) -> None:
        """Register management command arguments."""
        # Step 2: Optional single-org targeting.
        parser.add_argument(
            "--org",
            dest="org_slug",
            help="Backfill only a single organization by slug.",
        )

        # Step 3: Optional dry-run support for safer production inspection.
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be processed without writing data.",
        )

    def handle(self, *args, **options) -> None:
        """Execute the category backfill command."""
        # Step 4: Read normalized options.
        org_slug = options.get("org_slug")
        dry_run = bool(options.get("dry_run"))

        # Step 5: Resolve target organizations.
        organizations = self._get_organizations(org_slug=org_slug)

        total_defaults = len(DEFAULT_EXPENSE_CATEGORIES)
        total_created = 0
        total_skipped = 0
        processed_count = 0

        # Step 6: Process each organization independently.
        for organization in organizations:
            processed_count += 1

            if dry_run:
                existing_count = organization.expense_categories.count()
                missing_count = max(total_defaults - existing_count, 0)

                self.stdout.write(
                    self.style.WARNING(
                        "[DRY RUN] "
                        f"org={organization.slug} "
                        f"existing_categories={existing_count} "
                        f"potential_missing_up_to={missing_count}"
                    )
                )
                continue

            created_count = seed_default_expense_categories_for_organization(
                organization=organization,
            )
            skipped_count = max(total_defaults - created_count, 0)

            total_created += created_count
            total_skipped += skipped_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"org={organization.slug} "
                    f"created={created_count} "
                    f"skipped={skipped_count}"
                )
            )

        # Step 7: Print a final summary line.
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "[DRY RUN COMPLETE] "
                    f"organizations_checked={processed_count} "
                    f"default_category_total={total_defaults}"
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                "Backfill complete: "
                f"organizations_processed={processed_count} "
                f"default_category_total={total_defaults} "
                f"total_created={total_created} "
                f"total_skipped={total_skipped}"
            )
        )

    def _get_organizations(self, org_slug: str | None) -> Iterable[Organization]:
        """Return the organizations targeted by this run.

        Args:
            org_slug: Optional organization slug to restrict the run.

        Returns:
            Iterable[Organization]: Ordered organization queryset.

        Raises:
            CommandError: If a requested org slug does not exist.
        """
        # Step 8: Start with a deterministic ordering for readable output.
        queryset = Organization.objects.all().order_by("slug")

        # Step 9: Narrow to a single org when requested.
        if org_slug:
            queryset = queryset.filter(slug=org_slug)

            if not queryset.exists():
                raise CommandError(
                    f"Organization not found for slug='{org_slug}'."
                )

        return queryset