"""Expense CRUD API tests for the expenses domain.

These tests dispatch ViewSet actions directly with APIRequestFactory so they do
not depend on project-level organization middleware wiring.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import force_authenticate

from apps.expenses.choices import ExpenseScope, ExpenseStatus
from apps.expenses.views.expense_views import ExpenseViewSet

from apps.expenses.tests.factories import create_expense
from apps.expenses.tests.helpers import assert_decimal_equal, extract_collection_payload

pytestmark = pytest.mark.django_db


def _call_expense_action(
    *,
    api_rf,
    user,
    organization,
    method,
    action_map,
    path,
    data=None,
    pk=None,
    format=None,
):
    """Dispatch an expense ViewSet action with request.organization attached."""
    request_factory_method = getattr(api_rf, method.lower())
    request = request_factory_method(path, data=data or {}, format=format)
    force_authenticate(request, user=user)
    request.organization = organization
    view = ExpenseViewSet.as_view(action_map)
    response = view(request, pk=pk) if pk is not None else view(request)
    response.render()
    return response


# Step 1: List views must stay organization-scoped.
def test_expense_list_is_org_scoped(api_rf, user_a, organization_a, organization_b):
    create_expense(organization=organization_a, title="Org A Expense", amount="50.00")
    create_expense(organization=organization_b, title="Org B Expense", amount="900.00")

    response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="GET",
        action_map={"get": "list"},
        path="/expenses/",
    )

    rows = extract_collection_payload(response)
    assert response.status_code == 200
    assert len(rows) == 1
    assert rows[0]["title"] == "Org A Expense"


# Step 2: Create should flow through serializer + service successfully.
def test_expense_create_works(api_rf, user_a, organization_a, category_a, vendor_a):
    payload = {
        "organization": organization_a.id,
        "scope": ExpenseScope.ORGANIZATION,
        "category": category_a.id,
        "vendor": vendor_a.id,
        "title": "Created Through API",
        "description": "Created in API test",
        "amount": "123.45",
        "expense_date": "2026-02-01",
        "status": ExpenseStatus.DRAFT,
    }

    response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="POST",
        action_map={"post": "create"},
        path="/expenses/",
        data=payload,
        format="json",
    )

    assert response.status_code == 201
    assert response.data["title"] == "Created Through API"
    assert_decimal_equal(response.data["amount"], Decimal("123.45"))


# Step 3: Partial update should flow through the service layer.
def test_expense_partial_update_works(api_rf, user_a, organization_a):
    expense = create_expense(
        organization=organization_a,
        title="Before Update",
        amount="50.00",
        expense_date=date(2026, 2, 1),
    )

    response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="PATCH",
        action_map={"patch": "partial_update"},
        path=f"/expenses/{expense.id}/",
        pk=expense.id,
        data={"title": "After Update"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["title"] == "After Update"


# Step 4: Archive and unarchive actions should mutate expense state cleanly.
def test_expense_archive_and_unarchive_actions_work(api_rf, user_a, organization_a):
    expense = create_expense(organization=organization_a)

    archive_response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="POST",
        action_map={"post": "archive"},
        path=f"/expenses/{expense.id}/archive/",
        pk=expense.id,
        format="json",
    )
    unarchive_response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="POST",
        action_map={"post": "unarchive"},
        path=f"/expenses/{expense.id}/unarchive/",
        pk=expense.id,
        format="json",
    )

    assert archive_response.status_code == 200
    assert archive_response.data["is_archived"] is True
    assert unarchive_response.status_code == 200
    assert unarchive_response.data["is_archived"] is False


# Step 5: Attachments should list and upload within the same org-scoped expense.
def test_expense_attachments_list_and_upload_are_org_scoped(
    api_rf,
    user_a,
    organization_a,
):
    expense = create_expense(organization=organization_a)

    list_response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="GET",
        action_map={"get": "attachments"},
        path=f"/expenses/{expense.id}/attachments/",
        pk=expense.id,
    )
    assert list_response.status_code == 200
    assert list_response.data == []

    upload = SimpleUploadedFile(
        "receipt.txt",
        b"expense receipt",
        content_type="text/plain",
    )
    create_response = _call_expense_action(
        api_rf=api_rf,
        user=user_a,
        organization=organization_a,
        method="POST",
        action_map={"post": "attachments"},
        path=f"/expenses/{expense.id}/attachments/",
        pk=expense.id,
        data={
            "organization": organization_a.id,
            "expense": expense.id,
            "file": upload,
            "original_filename": "receipt.txt",
            "content_type": "text/plain",
            "file_size": len(b"expense receipt"),
        },
        format="multipart",
    )

    assert create_response.status_code == 201
    assert create_response.data["expense"] == expense.id
    assert create_response.data["organization"] == organization_a.id
