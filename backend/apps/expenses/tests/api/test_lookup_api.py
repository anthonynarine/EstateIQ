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
    create_category(
        organization=organization_a,
        name="Zz Org Scope Category A",
    )
    create_category(
        organization=organization_b,
        name="Zz Org Scope Category B",
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?search=Zz Org Scope",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert "Zz Org Scope Category A" in returned_names
    assert "Zz Org Scope Category B" not in returned_names
    assert all(row["organization"] == organization_a.id for row in rows)


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
        name="Zz Active Lookup Category",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Zz Inactive Lookup Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?search=Zz",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert "Zz Active Lookup Category" in returned_names
    assert "Zz Inactive Lookup Category" not in returned_names


# Step 4: Category lookup should include inactive when explicitly requested.
def test_category_lookup_can_include_inactive(api_rf, user_a, organization_a):
    create_category(
        organization=organization_a,
        name="Zz Active Include Category",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Zz Inactive Include Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?search=Zz&include_inactive=true",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert "Zz Active Include Category" in returned_names
    assert "Zz Inactive Include Category" in returned_names


# Step 5: Category lookup should support explicit inactive-only filtering.
def test_category_lookup_supports_explicit_inactive_filter(
    api_rf,
    user_a,
    organization_a,
):
    create_category(
        organization=organization_a,
        name="Zz Active Filter Category",
        is_active=True,
    )
    create_category(
        organization=organization_a,
        name="Zz Inactive Filter Category",
        is_active=False,
    )

    response = _dispatch(
        ExpenseCategoryViewSet,
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        path="/expense-categories/?search=Zz&is_active=false",
    )

    rows = extract_collection_payload(response)
    returned_names = {row["name"] for row in rows}

    assert response.status_code == 200
    assert "Zz Active Filter Category" not in returned_names
    assert "Zz Inactive Filter Category" in returned_names


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