# Filename: apps/expenses/tests/factories.py

# ✅ New Code
"""Test factories for the expenses domain.

These factories are intentionally app-local and lightweight.
They avoid introducing a large test dependency surface while still making
expenses-domain tests readable and reusable.
"""

from __future__ import annotations

import itertools
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import models
from django.utils.text import slugify

from apps.expenses.choices import (
    ExpenseCategoryKind,
    ExpenseScope,
    ExpenseSource,
    ExpenseStatus,
    ReimbursementStatus,
    VendorType,
)

_SEQUENCE = itertools.count(1)


# Step 1: Shared sequencing helpers.
def next_seq() -> int:
    """Return the next shared sequence integer for test data."""
    return next(_SEQUENCE)


def _field_names(model_class: type[models.Model]) -> set[str]:
    """Return concrete local field names for a model class."""
    return {field.name for field in model_class._meta.fields}


def _set_first_existing(
    *,
    model_class: type[models.Model],
    payload: dict[str, Any],
    candidates: list[str],
    value: Any,
) -> None:
    """Set the first existing candidate field on a payload dict."""
    names = _field_names(model_class)
    for candidate in candidates:
        if candidate in names and candidate not in payload:
            payload[candidate] = value
            return


def _default_scalar_for_field(field: models.Field, seq: int) -> Any:
    """Return a best-effort default scalar value for an unknown required field."""
    internal_type = field.get_internal_type()

    if internal_type in {"CharField", "TextField"}:
        if field.name == "slug":
            return f"test-{seq}"
        return f"test-{field.name}-{seq}"

    if internal_type == "SlugField":
        return slugify(f"test-{field.name}-{seq}")

    if internal_type == "EmailField":
        return f"test-{seq}@example.com"

    if internal_type in {
        "IntegerField",
        "BigIntegerField",
        "SmallIntegerField",
        "PositiveIntegerField",
        "PositiveBigIntegerField",
        "PositiveSmallIntegerField",
    }:
        return 1

    if internal_type in {"DecimalField", "FloatField"}:
        return Decimal("1.00")

    if internal_type == "BooleanField":
        return False

    if internal_type == "DateField":
        return date.today()

    if internal_type == "DateTimeField":
        return None

    choices = getattr(field, "choices", None)
    if choices:
        valid_choices = [choice[0] for choice in choices if choice[0] != ""]
        if valid_choices:
            return valid_choices[0]

    return f"test-{field.name}-{seq}"


def _fill_unknown_required_fields(
    *,
    model_class: type[models.Model],
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Fill any remaining required non-relational fields using safe defaults."""
    seq = next_seq()

    for field in model_class._meta.fields:
        if field.primary_key:
            continue
        if not getattr(field, "editable", True):
            continue
        if getattr(field, "auto_created", False):
            continue
        if field.name in payload:
            continue
        if field.null or field.blank:
            continue
        if field.has_default():
            continue
        if isinstance(field, (models.ForeignKey, models.OneToOneField)):
            raise RuntimeError(
                f"Factory missing required relation '{field.name}' for "
                f"{model_class._meta.label}. Pass it explicitly in the helper."
            )

        payload[field.name] = _default_scalar_for_field(field, seq)

    return payload


# Step 2: Core related-object factories.
def create_user(**overrides: Any):
    """Create a user instance using the active user model.

    This helper handles both username-based and email-based user models.
    """
    user_model = get_user_model()
    seq = next_seq()

    username_field = getattr(user_model, "USERNAME_FIELD", "username")
    payload: dict[str, Any] = {}

    if username_field == "email":
        payload["email"] = overrides.pop("email", f"user{seq}@example.com")
    else:
        payload[username_field] = overrides.pop(
            username_field,
            f"user_{seq}",
        )
        if "email" in _field_names(user_model):
            payload["email"] = overrides.pop("email", f"user{seq}@example.com")

    payload["password"] = overrides.pop("password", "testpass123")

    for field_name in ["first_name", "last_name"]:
        if field_name in _field_names(user_model) and field_name not in overrides:
            payload[field_name] = field_name.replace("_name", "").title()

    payload.update(overrides)

    manager = user_model._default_manager
    if hasattr(manager, "create_user"):
        password = payload.pop("password")
        return manager.create_user(password=password, **payload)

    payload.pop("password", None)
    return manager.create(**payload)


def create_organization(**overrides: Any):
    """Create an organization with best-effort support for varying schemas."""
    organization_model = apps.get_model("core", "Organization")
    seq = next_seq()
    payload: dict[str, Any] = {}

    _set_first_existing(
        model_class=organization_model,
        payload=payload,
        candidates=["name", "title"],
        value=f"Test Organization {seq}",
    )
    _set_first_existing(
        model_class=organization_model,
        payload=payload,
        candidates=["slug", "org_slug"],
        value=f"test-org-{seq}",
    )
    _set_first_existing(
        model_class=organization_model,
        payload=payload,
        candidates=["is_active"],
        value=True,
    )

    payload.update(overrides)
    payload = _fill_unknown_required_fields(
        model_class=organization_model,
        payload=payload,
    )
    return organization_model.objects.create(**payload)


def create_building(*, organization, **overrides: Any):
    """Create a building tied to the provided organization."""
    building_model = apps.get_model("buildings", "Building")
    seq = next_seq()
    payload: dict[str, Any] = {}

    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["organization", "org"],
        value=organization,
    )
    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["name", "title"],
        value=f"Building {seq}",
    )
    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["address_line1", "street_address", "address"],
        value=f"{100 + seq} Test Street",
    )
    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["city"],
        value="Test City",
    )
    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["state"],
        value="NJ",
    )
    _set_first_existing(
        model_class=building_model,
        payload=payload,
        candidates=["postal_code", "zip_code", "zip"],
        value="07030",
    )

    payload.update(overrides)
    payload = _fill_unknown_required_fields(
        model_class=building_model,
        payload=payload,
    )
    return building_model.objects.create(**payload)


def create_unit(*, organization, building, **overrides: Any):
    """Create a unit tied to the provided building and organization."""
    unit_model = apps.get_model("buildings", "Unit")
    seq = next_seq()
    payload: dict[str, Any] = {}

    _set_first_existing(
        model_class=unit_model,
        payload=payload,
        candidates=["organization", "org"],
        value=organization,
    )
    _set_first_existing(
        model_class=unit_model,
        payload=payload,
        candidates=["building"],
        value=building,
    )
    _set_first_existing(
        model_class=unit_model,
        payload=payload,
        candidates=["name", "unit_label", "label", "number"],
        value=f"U-{seq}",
    )
    _set_first_existing(
        model_class=unit_model,
        payload=payload,
        candidates=["beds"],
        value=1,
    )
    _set_first_existing(
        model_class=unit_model,
        payload=payload,
        candidates=["baths"],
        value=1,
    )

    payload.update(overrides)
    payload = _fill_unknown_required_fields(
        model_class=unit_model,
        payload=payload,
    )
    return unit_model.objects.create(**payload)


def create_lease(*, organization, unit, **overrides: Any):
    """Create a lease tied to the provided organization and unit."""
    lease_model = apps.get_model("leases", "Lease")
    seq = next_seq()
    payload: dict[str, Any] = {}

    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["organization", "org"],
        value=organization,
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["unit"],
        value=unit,
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["start_date"],
        value=date.today() - timedelta(days=30),
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["end_date"],
        value=date.today() + timedelta(days=335),
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["rent_amount"],
        value=Decimal("1500.00"),
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["deposit_amount"],
        value=Decimal("1500.00"),
    )
    _set_first_existing(
        model_class=lease_model,
        payload=payload,
        candidates=["due_day"],
        value=1,
    )

    payload.update(overrides)
    payload = _fill_unknown_required_fields(
        model_class=lease_model,
        payload=payload,
    )
    return lease_model.objects.create(**payload)


# Step 3: Expense-domain factories with lazy model imports.
def create_category(*, organization, **overrides: Any):
    """Create an expense category for an organization."""
    from apps.expenses.models import ExpenseCategory

    seq = next_seq()
    payload = {
        "organization": organization,
        "name": overrides.pop("name", f"Category {seq}"),
        "slug": overrides.pop("slug", f"category-{seq}"),
        "kind": overrides.pop("kind", ExpenseCategoryKind.OTHER),
        "description": overrides.pop("description", ""),
        "is_active": overrides.pop("is_active", True),
        "sort_order": overrides.pop("sort_order", 0),
    }
    payload.update(overrides)
    return ExpenseCategory.objects.create(**payload)


def create_vendor(*, organization, **overrides: Any):
    """Create a vendor for an organization."""
    from apps.expenses.models import Vendor

    seq = next_seq()
    payload = {
        "organization": organization,
        "name": overrides.pop("name", f"Vendor {seq}"),
        "vendor_type": overrides.pop("vendor_type", VendorType.OTHER),
        "contact_name": overrides.pop("contact_name", ""),
        "email": overrides.pop("email", ""),
        "phone": overrides.pop("phone", ""),
        "notes": overrides.pop("notes", ""),
        "is_active": overrides.pop("is_active", True),
    }
    payload.update(overrides)
    return Vendor.objects.create(**payload)


def create_expense(
    *,
    organization,
    title: str = "Test Expense",
    amount: Decimal | str = Decimal("100.00"),
    expense_date: date | None = None,
    scope: str = ExpenseScope.ORGANIZATION,
    building=None,
    unit=None,
    lease=None,
    category=None,
    vendor=None,
    description: str = "",
    due_date: date | None = None,
    paid_date: date | None = None,
    status: str = ExpenseStatus.DRAFT,
    is_reimbursable: bool = False,
    reimbursement_status: str = ReimbursementStatus.NOT_APPLICABLE,
    invoice_number: str = "",
    external_reference: str = "",
    notes: str = "",
    source: str = ExpenseSource.MANUAL,
    is_archived: bool = False,
    archived_at=None,
    created_by=None,
    updated_by=None,
):
    """Create a structurally valid expense for tests.

    For lease-scoped expenses, building and unit are derived from the lease when
    not explicitly supplied so selectors and serializers see the persisted
    reporting fields the service layer would normally enforce.
    """
    from apps.expenses.models import Expense

    expense_date = expense_date or date.today()

    if scope == ExpenseScope.LEASE and lease is not None:
        if building is None:
            building = getattr(getattr(lease, "unit", None), "building", None)
        if unit is None:
            unit = getattr(lease, "unit", None)

    return Expense.objects.create(
        organization=organization,
        scope=scope,
        building=building,
        unit=unit,
        lease=lease,
        category=category,
        vendor=vendor,
        title=title,
        description=description,
        amount=Decimal(str(amount)),
        expense_date=expense_date,
        due_date=due_date,
        paid_date=paid_date,
        status=status,
        is_reimbursable=is_reimbursable,
        reimbursement_status=reimbursement_status,
        invoice_number=invoice_number,
        external_reference=external_reference,
        notes=notes,
        source=source,
        is_archived=is_archived,
        archived_at=archived_at,
        created_by=created_by,
        updated_by=updated_by,
    )