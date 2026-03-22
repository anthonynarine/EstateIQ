# Filename: backend/apps/expenses/services/category_seed_service.py

"""Seed services for default expense category bootstrap."""

from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify

from apps.expenses.default_categories import DEFAULT_EXPENSE_CATEGORIES
from apps.expenses.models import ExpenseCategory


@transaction.atomic
def seed_default_expense_categories_for_organization(organization) -> int:
    """Seed default expense categories for an organization.

    This function is idempotent. Re-running it will not create duplicates.

    Args:
        organization: Organization instance that owns the categories.

    Returns:
        int: Number of newly created categories.
    """
    created_count = 0

    for definition in DEFAULT_EXPENSE_CATEGORIES:
        # Step 1: Build a stable slug from the seeded category name.
        slug = slugify(definition["name"])

        # Step 2: Create the org-scoped category if it does not already exist.
        _, created = ExpenseCategory.objects.get_or_create(
            organization=organization,
            slug=slug,
            defaults={
                "name": definition["name"],
                "kind": definition["kind"],
                "description": definition["description"],
                "sort_order": definition["sort_order"],
                "is_active": True,
            },
        )

        if created:
            created_count += 1

    return created_count