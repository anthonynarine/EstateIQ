"""Write-service tests for the expenses domain."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.expenses.choices import ExpenseScope, ExpenseStatus, ReimbursementStatus
from apps.expenses.services import ExpenseService, ExpenseWritePayload

pytestmark = pytest.mark.django_db


# Step 1: Valid payloads should persist cleanly through the service facade.
def test_create_expense_persists_valid_payload(
    organization_a,
    category_a,
    vendor_a,
    user_a,
):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.ORGANIZATION,
        title="Portfolio Insurance",
        amount=Decimal("100.00"),
        expense_date=date(2026, 2, 1),
        category=category_a,
        vendor=vendor_a,
        created_by=user_a,
        updated_by=user_a,
    )

    expense = ExpenseService.create_expense(payload=payload)

    assert expense.organization_id == organization_a.id
    assert expense.title == "Portfolio Insurance"
    assert expense.category_id == category_a.id
    assert expense.vendor_id == vendor_a.id
    assert expense.created_by_id == user_a.id
    assert expense.updated_by_id == user_a.id


# Step 2: Cross-org related objects must be rejected.
def test_create_expense_rejects_cross_org_related_objects(
    organization_a,
    building_b1,
):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.BUILDING,
        building=building_b1,
        title="Cross Org Repair",
        amount=Decimal("10.00"),
        expense_date=date(2026, 2, 1),
    )

    with pytest.raises(ValidationError, match="Building does not belong"):
        ExpenseService.create_expense(payload=payload)


# Step 3: Scope shape rules must stay enforced in the service layer.
def test_create_expense_rejects_invalid_scope_shape(organization_a, unit_a1):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.ORGANIZATION,
        unit=unit_a1,
        title="Bad Scope",
        amount=Decimal("10.00"),
        expense_date=date(2026, 2, 1),
    )

    with pytest.raises(ValidationError, match="Organization-scoped expenses"):
        ExpenseService.create_expense(payload=payload)


# Step 4: Lease-scoped writes should derive building and unit from the lease.
def test_create_expense_derives_building_and_unit_from_lease(
    organization_a,
    lease_a1,
):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.LEASE,
        lease=lease_a1,
        title="Lease Repair",
        amount=Decimal("75.00"),
        expense_date=date(2026, 2, 1),
    )

    expense = ExpenseService.create_expense(payload=payload)

    assert expense.lease_id == lease_a1.id
    assert expense.unit_id == lease_a1.unit_id
    assert expense.building_id == lease_a1.unit.building_id


# Step 5: Paid status must include paid_date.
def test_create_expense_requires_paid_date_for_paid_status(organization_a):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.ORGANIZATION,
        title="Paid Without Date",
        amount=Decimal("50.00"),
        expense_date=date(2026, 2, 1),
        status=ExpenseStatus.PAID,
    )

    with pytest.raises(ValidationError, match="paid_date"):
        ExpenseService.create_expense(payload=payload)


# Step 6: Non-paid statuses must not accept paid_date.
def test_create_expense_rejects_paid_date_for_non_paid_status(organization_a):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.ORGANIZATION,
        title="Draft With Paid Date",
        amount=Decimal("50.00"),
        expense_date=date(2026, 2, 1),
        status=ExpenseStatus.DRAFT,
        paid_date=date(2026, 2, 2),
    )

    with pytest.raises(ValidationError, match="Only expenses with paid status"):
        ExpenseService.create_expense(payload=payload)


# Step 7: Reimbursement flags and statuses must agree.
def test_create_expense_enforces_reimbursement_consistency(organization_a):
    payload = ExpenseWritePayload(
        organization=organization_a,
        scope=ExpenseScope.ORGANIZATION,
        title="Bad Reimbursement",
        amount=Decimal("50.00"),
        expense_date=date(2026, 2, 1),
        is_reimbursable=False,
        reimbursement_status=ReimbursementStatus.REIMBURSED,
    )

    with pytest.raises(ValidationError, match="Non-reimbursable expenses"):
        ExpenseService.create_expense(payload=payload)


# Step 8: Updates should validate against the same business rules.
def test_update_expense_validates_relationships_and_sets_updated_by(
    organization_a,
    building_a1,
    building_a2,
    unit_a2,
    user_a,
):
    expense = ExpenseService.create_expense(
        payload=ExpenseWritePayload(
            organization=organization_a,
            scope=ExpenseScope.BUILDING,
            building=building_a1,
            title="Initial Repair",
            amount=Decimal("120.00"),
            expense_date=date(2026, 2, 1),
        )
    )

    updated = ExpenseService.update_expense(
        expense=expense,
        updates={
            "scope": ExpenseScope.UNIT,
            "building": building_a2,
            "unit": unit_a2,
            "title": "Updated Repair",
        },
        updated_by=user_a,
    )

    assert updated.scope == ExpenseScope.UNIT
    assert updated.building_id == building_a2.id
    assert updated.unit_id == unit_a2.id
    assert updated.title == "Updated Repair"
    assert updated.updated_by_id == user_a.id

def test_create_expense_defaults_source_to_manual(organization_a, building_a1):
    expense = ExpenseService.create_expense(
        payload=ExpenseWritePayload(
            organization=organization_a,
            scope=ExpenseScope.BUILDING,
            building=building_a1,
            title="Default Source Expense",
            amount=Decimal("50.00"),
            expense_date=date(2026, 2, 1),
        )
    )

    assert expense.source == ExpenseSource.MANUAL