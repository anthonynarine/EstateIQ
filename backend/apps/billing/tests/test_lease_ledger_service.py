# Filename: apps/billing/tests/test_lease_ledger_service.py

"""
Tests for LeaseLedgerService.

These tests validate that lease ledger totals are deterministic and derived
purely from Charges, Payments, and Allocations (no stored balances).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, Optional

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod
from apps.billing.services.lease_ledger_service import LeaseLedgerService


def _model_field_names(model_cls: Any) -> set[str]:
    """Return a set of concrete field names for a Django model class."""
    # Step 1: collect concrete fields (no M2M)
    return {f.name for f in model_cls._meta.get_fields() if getattr(f, "concrete", False)}


def _set_first_existing_field(
    *,
    model_cls: Any,
    kwargs: Dict[str, Any],
    candidates: Iterable[str],
    value: Any,
) -> Optional[str]:
    """
    Set the first candidate field that exists on model_cls.

    Returns:
        The chosen field name, or None if none exist.
    """
    # Step 1: find available fields
    fields = _model_field_names(model_cls)

    # Step 2: choose the first match
    for name in candidates:
        if name in fields:
            kwargs[name] = value
            return name
    return None


class LeaseLedgerServiceTests(TestCase):
    """Unit tests for building a deterministic lease ledger."""

    def setUp(self) -> None:
        """Create a minimal org + unit + lease fixture for ledger tests."""
        # Step 1: user
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        # Step 2: imports (project-local)
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.Organization = Organization
        self.Building = Building
        self.Unit = Unit
        self.Lease = Lease

        # Step 3: org
        self.org = Organization.objects.create(name="Test Org", slug="test-org")

        # Step 4: building (these fields worked in your earlier runs; keep them)
        self.building = Building.objects.create(
            organization=self.org,
            name="123 Main",
            address_line1="123 Main St",
            city="Nowhere",
            state="NA",
            postal_code="00000",
        )

        # Step 5: unit — choose correct identifier field automatically
        unit_kwargs: Dict[str, Any] = {
            "organization": self.org,
            "building": self.building,
        }

        chosen_unit_field = _set_first_existing_field(
            model_cls=Unit,
            kwargs=unit_kwargs,
            candidates=[
                "unit_label",
                "label",
                "unit_number",
                "number",
                "name",
                "unit",
            ],
            value="1A",
        )

        if chosen_unit_field is None:
            # Step 6: last resort: attempt creation without a label field
            # (If your model requires a label, Django will tell us the required field name.)
            pass

        self.unit = Unit.objects.create(**unit_kwargs)

        # Step 7: lease — choose correct rent field automatically
        lease_kwargs: Dict[str, Any] = {
            "organization": self.org,
            "unit": self.unit,
            "start_date": date(2026, 1, 1),
            "end_date": None,
        }

        chosen_rent_field = _set_first_existing_field(
            model_cls=Lease,
            kwargs=lease_kwargs,
            candidates=[
                "rent_amount",
                "rent",
                "monthly_rent",
                "rent_price",
                "amount",
            ],
            value=Decimal("1200.00"),
        )

        if chosen_rent_field is None:
            # Step 8: if rent is required but named differently, test will error with the exact field name
            pass

        self.lease = Lease.objects.create(**lease_kwargs)

    def test_ledger_totals_with_partial_payment(self) -> None:
        """A partial payment allocated across multiple charges computes correct totals."""
        # Step 1: create two rent charges
        c1 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        c2 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 3, 1),
            created_by=self.user,
        )

        # Step 2: payment of 1500
        p1 = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("1500.00"),
            paid_at=datetime(2026, 2, 5, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        # Step 3: allocate FIFO: 1200 to Feb, 300 to Mar
        Allocation.objects.create(organization=self.org, payment=p1, charge=c1, amount=Decimal("1200.00"))
        Allocation.objects.create(organization=self.org, payment=p1, charge=c2, amount=Decimal("300.00"))

        # Step 4: build ledger
        ledger = LeaseLedgerService.build_lease_ledger(
            organization_id=self.org.id,
            lease_id=self.lease.id,
        )

        # Step 5: assert totals (serialized as strings by the service)
        self.assertEqual(ledger["totals"]["charges"], "2400.00")
        self.assertEqual(ledger["totals"]["payments"], "1500.00")
        self.assertEqual(ledger["totals"]["allocated"], "1500.00")
        self.assertEqual(ledger["totals"]["balance"], "900.00")

        # Step 6: assert charge balances
        charges = {row["due_date"]: row for row in ledger["charges"]}
        self.assertEqual(charges["2026-02-01"]["balance"], Decimal("0.00"))
        self.assertEqual(charges["2026-03-01"]["balance"], Decimal("900.00"))

    def test_unapplied_payments_total(self) -> None:
        """If payments exceed allocations, unapplied amount is computed correctly."""
        # Step 1: create one charge
        c1 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("500.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )

        # Step 2: payment larger than charge
        p1 = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("800.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.ZELLE,
            created_by=self.user,
        )

        # Step 3: allocate only 500 (leave 300 unapplied)
        Allocation.objects.create(organization=self.org, payment=p1, charge=c1, amount=Decimal("500.00"))

        # Step 4: build ledger
        ledger = LeaseLedgerService.build_lease_ledger(
            organization_id=self.org.id,
            lease_id=self.lease.id,
        )

        # Step 5: ensure unapplied is 300
        self.assertEqual(ledger["totals"]["unapplied_payments"], "300.00")
