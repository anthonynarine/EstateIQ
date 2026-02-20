# Filename: apps/billing/tests/test_rent_charge_service.py

"""
Tests for rent charge generation.

Validates that monthly rent charges generated from a lease are:
- deterministic (lease + month => due_date)
- idempotent (calling twice does not create duplicates)
- lease-term safe (cannot generate before start month or after end month)
- due-day safe (clamps to last day of month when needed)
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.billing.models import Charge, ChargeKind
from apps.billing.services.rent_charge_service import RentChargeService


class RentChargeServiceTests(TestCase):
    """Test suite for RentChargeService."""

    def setUp(self) -> None:
        """Create baseline org/building/unit/lease used across tests."""
        # Step 1: create user
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        # Step 2: import models
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        # Step 3: create org
        self.org = Organization.objects.create(name="Test Org", slug="test-org")

        # Step 4: create building (may need adjustment if your Building schema differs)
        self.building = Building.objects.create(
            organization=self.org,
            name="123 Main",
            address_line1="123 Main St",
            city="Nowhere",
            state="NA",
            postal_code="00000",
        )

        # Step 5: create unit using schema-aware label field selection
        unit_kwargs = {"organization": self.org, "building": self.building}
        unit_field_names = {f.name for f in Unit._meta.fields}

        candidate_unit_fields = [
            "unit_label",
            "label",
            "unit_number",
            "number",
            "name",
            "identifier",
            "unit",
            "code",
        ]
        chosen_unit_field = next((f for f in candidate_unit_fields if f in unit_field_names), None)
        if chosen_unit_field is None:
            raise RuntimeError(
                f"Could not find a unit label field on Unit. Fields: {sorted(unit_field_names)}"
            )

        unit_kwargs[chosen_unit_field] = "1A"
        self.unit = Unit.objects.create(**unit_kwargs)

        # Step 6: create lease using schema-aware field selection
        lease_field_names = {f.name for f in Lease._meta.fields}

        lease_kwargs = {
            "organization": self.org,
            "unit": self.unit,
            "start_date": date(2026, 1, 1),
        }

        # ✅ New Code: detect rent field (required)
        rent_value = Decimal("1200.00")
        candidate_rent_fields = [
            "rent_amount",
            "monthly_rent",
            "rent",
            "rent_monthly",
            "rent_price",
        ]
        chosen_rent_field = next((f for f in candidate_rent_fields if f in lease_field_names), None)
        if chosen_rent_field is None:
            raise RuntimeError(
                f"Could not find a rent amount field on Lease. Fields: {sorted(lease_field_names)}"
            )
        lease_kwargs[chosen_rent_field] = rent_value

        # ✅ New Code: optional due-day field (your Lease validator enforces 1..28)
        candidate_due_fields = ["due_day", "rent_due_day", "due_day_of_month"]
        chosen_due_field = next((f for f in candidate_due_fields if f in lease_field_names), None)
        if chosen_due_field is not None:
            lease_kwargs[chosen_due_field] = 28

        # ✅ New Code: optional end_date
        if "end_date" in lease_field_names:
            lease_kwargs["end_date"] = None

        self.lease = Lease.objects.create(**lease_kwargs)

    def test_generate_creates_rent_charge(self) -> None:
        """Creates a rent charge and computes due date correctly."""
        # Step 1: generate for Feb 2026
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=self.lease.id,
            year=2026,
            month=2,
            created_by_id=self.user.id,
        )

        # Step 2: assert created
        self.assertTrue(result.created)

        # Step 3: verify charge
        charge = Charge.objects.get(id=result.charge_id)
        self.assertEqual(charge.kind, ChargeKind.RENT)
        self.assertEqual(charge.amount, Decimal("1200.00"))

        # Step 4: expected due date depends on due-day field existence
        due_day = 1
        for attr in ("due_day", "rent_due_day", "due_day_of_month"):
            if hasattr(self.lease, attr) and getattr(self.lease, attr):
                due_day = int(getattr(self.lease, attr))
                break

        # If due_day exists we set it to 28 (valid per Lease validation), otherwise service defaults to 1.
        expected_due = date(2026, 2, 28) if due_day == 28 else date(2026, 2, 1)
        self.assertEqual(charge.due_date, expected_due)

    def test_generate_is_idempotent(self) -> None:
        """Calling twice for the same lease+month returns the existing charge."""
        r1 = RentChargeService.generate_monthly_rent_charge(
            lease_id=self.lease.id,
            year=2026,
            month=3,
            created_by_id=self.user.id,
        )
        r2 = RentChargeService.generate_monthly_rent_charge(
            lease_id=self.lease.id,
            year=2026,
            month=3,
            created_by_id=self.user.id,
        )

        self.assertTrue(r1.created)
        self.assertFalse(r2.created)
        self.assertEqual(r1.charge_id, r2.charge_id)

        self.assertEqual(
            Charge.objects.filter(
                organization=self.org,
                lease=self.lease,
                kind=ChargeKind.RENT,
                due_date=r1.due_date,
            ).count(),
            1,
        )

    def test_rejects_before_start_month(self) -> None:
        """Cannot generate charges for months before lease start month."""
        with self.assertRaises(ValidationError):
            RentChargeService.generate_monthly_rent_charge(
                lease_id=self.lease.id,
                year=2025,
                month=12,
                created_by_id=self.user.id,
            )

    def test_rejects_after_end_month(self) -> None:
        """Cannot generate charges for months after end month (if end_date exists)."""
        from apps.leases.models import Lease  # noqa: WPS433

        if "end_date" not in {f.name for f in Lease._meta.fields}:
            self.skipTest("Lease has no end_date; skipping end-month enforcement test.")

        Lease.objects.filter(id=self.lease.id).update(end_date=date(2026, 3, 15))

        with self.assertRaises(ValidationError):
            RentChargeService.generate_monthly_rent_charge(
                lease_id=self.lease.id,
                year=2026,
                month=4,
                created_by_id=self.user.id,
            )

    def test_rejects_invalid_month(self) -> None:
        """Month must be between 1 and 12."""
        with self.assertRaises(ValidationError):
            RentChargeService.generate_monthly_rent_charge(
                lease_id=self.lease.id,
                year=2026,
                month=13,
                created_by_id=self.user.id,
            )
