"""Archive-service tests for the expenses domain."""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.expenses.services import ExpenseService

from apps.expenses.tests.factories import create_expense

pytestmark = pytest.mark.django_db


# Step 1: Archive should flip state and stamp metadata.
def test_archive_expense_sets_archive_fields(organization_a, user_a):
    expense = create_expense(organization=organization_a)

    archived = ExpenseService.archive_expense(expense=expense, updated_by=user_a)

    assert archived.is_archived is True
    assert archived.archived_at is not None
    assert archived.updated_by_id == user_a.id


# Step 2: Unarchive should clear archive state cleanly.
def test_unarchive_expense_clears_archive_fields(organization_a, user_a):
    expense = create_expense(organization=organization_a)
    ExpenseService.archive_expense(expense=expense, updated_by=user_a)

    restored = ExpenseService.unarchive_expense(expense=expense, updated_by=user_a)

    assert restored.is_archived is False
    assert restored.archived_at is None
    assert restored.updated_by_id == user_a.id


# Step 3: Repeated archive calls should behave idempotently.
def test_archive_expense_is_idempotent(organization_a, user_a):
    expense = create_expense(organization=organization_a)

    first = ExpenseService.archive_expense(expense=expense, updated_by=user_a)
    first_timestamp = first.archived_at
    second = ExpenseService.archive_expense(expense=first, updated_by=user_a)

    assert second.is_archived is True
    assert second.archived_at == first_timestamp
