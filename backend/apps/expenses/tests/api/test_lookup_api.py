# Filename: apps/expenses/tests/api/test_lookup_api.py

"""Lookup API tests for categories and vendors."""

from __future__ import annotations

import pytest
from rest_framework.test import force_authenticate

from apps.expenses.tests.factories import create_category, create_vendor
from apps.expenses.tests.helpers import extract_collection_payload
from apps.expenses.views.category_views import ExpenseCategoryViewSet
from apps.expenses.views.vendor_views import VendorViewSet

pytestmark = pytest.mark.django_db


def _dispatch(viewset_class, *, api_rf, user, organization, path):
    """Dispatch a simple list action with request.organization attached."""
    # Step 1: Build a GET request for the requested path.
    request = api_rf.get(path)

    # Step 2: Attach the authenticated user and org context.
    force_authenticate(request, user=user)
    request.organization = organization

    # Step 3: Invoke the DRF list action directly.
    view = viewset_class.as_view({"get": "list"})
    response = view(request)
    response.render()
    return response


# Step 1: Category lookup endpoints must remain organization-scoped.
def test_category_list_is_org_scoped(api_rf, user_a, organization_a, organization_b):
    create_category(organization=organization_a, name="Org A Category")
    create_category(organization=organization_b, name="Org B Category")

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/",
    )

    rows = extract_collection_payload(response)

    assert response.status_code == 200
    assert len(rows) == 1
    assert rows[0]["name"] == "Org A Category"


# Step 2: Vendor lookup endpoints must remain organization-scoped.
def test_vendor_list_is_org_scoped(api_rf, user_a, organization_a, organization_b):
    create_vendor(organization=organization_a, name="Org A Vendor")
    create_vendor(organization=organization_b, name="Org B Vendor")

    response = _dispatch(
        VendorViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/vendors/",
    )

    rows = extract_collection_payload(response)

    assert response.status_code == 200
    assert len(rows) == 1
    assert rows[0]["name"] == "Org A Vendor"


# Step 3: Category lookup should hide inactive records by default.
def test_category_lookup_hides_inactive_by_default(api_rf, user_a, organization_a):
    create_category(
        organization=organization_a,
        name="Repairs And Maintenance",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Inactive Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert returned_names == {"Repairs And Maintenance"}


# Step 4: Category lookup should include inactive when explicitly requested.
def test_category_lookup_can_include_inactive(api_rf, user_a, organization_a):
    create_category(
        organization=organization_a,
        name="Repairs And Maintenance",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Inactive Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?include_inactive=true",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert returned_names == {
        "Repairs And Maintenance",
        "Inactive Category",
    }


# Step 5: Category lookup should support explicit inactive-only filtering.
def test_category_lookup_supports_explicit_inactive_filter(
    api_rf,
    user_a,
    organization_a,
):
    create_category(
        organization=organization_a,
        name="Repairs And Maintenance",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Inactive Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?is_active=false",
    )

    rows = extract_collection_payload(response)

    assert response.status_code == 200
    assert len(rows) == 1
    assert rows[0]["name"] == "Inactive Category"


# Step 6: Vendor lookup should hide inactive records by default.
def test_vendor_lookup_hides_inactive_by_default(api_rf, user_a, organization_a):
    create_vendor(
        organization=organization_a,
        name="Home Depot",
        is_active=True,
    )
    create_vendor(
        organization=organization_a,
        name="Inactive Vendor",
        is_active=False,
    )

    response = _dispatch(
        VendorViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/vendors/",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert returned_names == {"Home Depot"}


# Step 7: Vendor lookup should include inactive when explicitly requested.
def test_vendor_lookup_can_include_inactive(api_rf, user_a, organization_a):
    create_vendor(
        organization=organization_a,
        name="Home Depot",
        is_active=True,
    )
    create_vendor(
        organization=organization_a,
        name="Inactive Vendor",
        is_active=False,
    )

    response = _dispatch(
        VendorViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/vendors/?include_inactive=true",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert returned_names == {
        "Home Depot",
        "Inactive Vendor",
    }


# Step 8: Vendor lookup should support explicit inactive-only filtering.
def test_vendor_lookup_supports_explicit_inactive_filter(
    api_rf,
    user_a,
    organization_a,
):
    create_vendor(
        organization=organization_a,
        name="Home Depot",
        is_active=True,
    )
    create_vendor(
        organization=organization_a,
        name="Inactive Vendor",
        is_active=False,
    )

    response = _dispatch(
        VendorViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/vendors/?is_active=false",
    )

    rows = extract_collection_payload(response)

    assert response.status_code == 200
    assert len(rows) == 1
    assert rows[0]["name"] == "Inactive Vendor"