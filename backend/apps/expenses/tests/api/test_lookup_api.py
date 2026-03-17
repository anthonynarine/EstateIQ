"""Lookup API tests for categories and vendors."""

from __future__ import annotations

import pytest
from rest_framework.test import force_authenticate

from apps.expenses.views.category_views import ExpenseCategoryViewSet
from apps.expenses.views.vendor_views import VendorViewSet

from apps.expenses.tests.factories import create_category, create_vendor
from apps.expenses.tests.helpers import extract_collection_payload


pytestmark = pytest.mark.django_db


def _dispatch(viewset_class, *, api_rf, user, organization, path):
    """Dispatch a simple list action with request.organization attached."""
    request = api_rf.get(path)
    force_authenticate(request, user=user)
    request.organization = organization
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
