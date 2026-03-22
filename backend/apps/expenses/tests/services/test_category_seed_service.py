# ✅ New Code

"""Tests for default expense category seeding."""

from __future__ import annotations

import pytest

from apps.core.models import Organization
from apps.expenses.default_categories import DEFAULT_EXPENSE_CATEGORIES
from apps.expenses.models import ExpenseCategory
from apps.expenses.services.category_seed_service import (
    seed_default_expense_categories_for_organization,
)

pytestmark = pytest.mark.django_db


# Step 1: Service should seed all default categories for an org.
def test_seed_default_expense_categories_for_organization_creates_defaults():
    organization = Organization.objects.create(
        name="Acme Holdings",
        slug="acme-holdings",
    )

    ExpenseCategory.objects.filter(organization=organization).delete()

    created_count = seed_default_expense_categories_for_organization(organization)

    categories = ExpenseCategory.objects.filter(organization=organization)

    assert created_count == len(DEFAULT_EXPENSE_CATEGORIES)
    assert categories.count() == len(DEFAULT_EXPENSE_CATEGORIES)


# Step 2: Service should be idempotent on repeat runs.
def test_seed_default_expense_categories_for_organization_is_idempotent():
    organization = Organization.objects.create(
        name="Bravo Properties",
        slug="bravo-properties",
    )

    ExpenseCategory.objects.filter(organization=organization).delete()

    first_created_count = seed_default_expense_categories_for_organization(
        organization
    )
    second_created_count = seed_default_expense_categories_for_organization(
        organization
    )

    categories = ExpenseCategory.objects.filter(organization=organization)

    assert first_created_count == len(DEFAULT_EXPENSE_CATEGORIES)
    assert second_created_count == 0
    assert categories.count() == len(DEFAULT_EXPENSE_CATEGORIES)


# Step 3: Organization creation signal should auto-seed defaults.
def test_organization_creation_auto_seeds_default_expense_categories():
    organization = Organization.objects.create(
        name="Cedar Rentals",
        slug="cedar-rentals",
    )

    categories = ExpenseCategory.objects.filter(organization=organization)

    assert categories.count() == len(DEFAULT_EXPENSE_CATEGORIES)
    assert categories.filter(name="Mortgage").exists()
    assert categories.filter(name="Repairs And Maintenance").exists()
    assert categories.filter(name="Other").exists()