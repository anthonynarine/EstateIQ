# Filename: apps/expenses/tests/conftest.py

# ✅ New Code
"""Pytest fixtures for the expenses domain."""

from __future__ import annotations

import pytest


# Step 1: Lazily import factory helpers only when fixtures are executed.
def _factories():
    """Return the local factories module lazily.

    This avoids importing model-heavy modules during early pytest collection.
    """
    from . import factories

    return factories


@pytest.fixture
def api_rf():
    """Return a DRF API request factory.

    Importing DRF here instead of at module scope prevents early collection
    failures before Django is fully initialized.
    """
    from rest_framework.test import APIRequestFactory

    return APIRequestFactory()


@pytest.fixture
def user_a():
    """Return a primary authenticated user."""
    return _factories().create_user()


@pytest.fixture
def user_b():
    """Return a secondary authenticated user."""
    return _factories().create_user()


@pytest.fixture
def organization_a():
    """Return the primary organization."""
    return _factories().create_organization()


@pytest.fixture
def organization_b():
    """Return the secondary organization for isolation tests."""
    return _factories().create_organization()


@pytest.fixture
def building_a1(organization_a):
    """Return the first building for organization A."""
    return _factories().create_building(organization=organization_a)


@pytest.fixture
def building_a2(organization_a):
    """Return the second building for organization A."""
    return _factories().create_building(organization=organization_a)


@pytest.fixture
def building_b1(organization_b):
    """Return the first building for organization B."""
    return _factories().create_building(organization=organization_b)


@pytest.fixture
def unit_a1(organization_a, building_a1):
    """Return the first unit for organization A."""
    return _factories().create_unit(
        organization=organization_a,
        building=building_a1,
    )


@pytest.fixture
def unit_a2(organization_a, building_a2):
    """Return the second unit for organization A."""
    return _factories().create_unit(
        organization=organization_a,
        building=building_a2,
    )


@pytest.fixture
def unit_b1(organization_b, building_b1):
    """Return the first unit for organization B."""
    return _factories().create_unit(
        organization=organization_b,
        building=building_b1,
    )


@pytest.fixture
def lease_a1(organization_a, unit_a1):
    """Return a lease for organization A."""
    return _factories().create_lease(
        organization=organization_a,
        unit=unit_a1,
    )


@pytest.fixture
def lease_b1(organization_b, unit_b1):
    """Return a lease for organization B."""
    return _factories().create_lease(
        organization=organization_b,
        unit=unit_b1,
    )


@pytest.fixture
def category_a(organization_a):
    """Return a category for organization A."""
    return _factories().create_category(
        organization=organization_a,
        name="Repairs",
    )


@pytest.fixture
def category_b(organization_b):
    """Return a category for organization B."""
    return _factories().create_category(
        organization=organization_b,
        name="Utilities",
    )


@pytest.fixture
def vendor_a(organization_a):
    """Return a vendor for organization A."""
    return _factories().create_vendor(
        organization=organization_a,
        name="Vendor A",
    )


@pytest.fixture
def vendor_b(organization_b):
    """Return a vendor for organization B."""
    return _factories().create_vendor(
        organization=organization_b,
        name="Vendor B",
    )


@pytest.fixture
def archived_expense_a(organization_a, category_a, vendor_a):
    """Return an archived organization-scoped expense for organization A."""
    return _factories().create_expense(
        organization=organization_a,
        title="Archived Expense",
        amount="25.00",
        category=category_a,
        vendor=vendor_a,
        is_archived=True,
    )