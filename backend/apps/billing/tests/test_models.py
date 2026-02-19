# Filename: apps/billing/tests/test_models.py

"""
Billing model tests.

These tests validate the foundational safety invariants for a ledger-first system:
- Charge/Payment/Allocation amounts must be > 0 (DB constraints).
- Allocation must not cross lease boundaries.
- Helper sum methods return correct totals.

Note:
This test suite uses schema-adaptive fixtures for Unit/Tenant/Lease creation so it won't
break if your field names differ slightly across modules.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod


class BillingModelTests(TestCase):
    """Model-level safety tests for the billing ledger primitives."""

    @staticmethod
    def _create_unit(Unit, *, organization, building, unit_token: str):
        """Create a Unit using whichever identifier field exists in this codebase."""
        # Step 1: base kwargs
        unit_kwargs = {
            "organization": organization,
            "building": building,
        }

        # Step 2: pick the correct identifier field for your Unit model
        if hasattr(Unit, "unit_label"):
            unit_kwargs["unit_label"] = unit_token
        elif hasattr(Unit, "unit_number"):
            unit_kwargs["unit_number"] = unit_token
        elif hasattr(Unit, "number"):
            unit_kwargs["number"] = unit_token
        elif hasattr(Unit, "name"):
            unit_kwargs["name"] = unit_token
        elif hasattr(Unit, "label"):
            unit_kwargs["label"] = unit_token
        else:
            raise AssertionError(
                "Unit model has no recognized identifier field. "
                "Update this test to match your Unit schema."
            )

        return Unit.objects.create(**unit_kwargs)

    @staticmethod
    def _create_tenant(Tenant, *, organization):
        """Create a Tenant using whichever common fields exist."""
        # Step 1: base kwargs
        tenant_kwargs = {"organization": organization}

        # Step 2: assign a name in whatever shape exists
        if hasattr(Tenant, "first_name") and hasattr(Tenant, "last_name"):
            tenant_kwargs["first_name"] = "A"
            tenant_kwargs["last_name"] = "Tenant"
        elif hasattr(Tenant, "full_name"):
            tenant_kwargs["full_name"] = "A Tenant"
        elif hasattr(Tenant, "name"):
            tenant_kwargs["name"] = "A Tenant"
        elif hasattr(Tenant, "display_name"):
            tenant_kwargs["display_name"] = "A Tenant"

        # Step 3: email is common, but not guaranteed
        if hasattr(Tenant, "email"):
            tenant_kwargs["email"] = "tenant@example.com"

        # Step 4: phone is common, but optional
        if hasattr(Tenant, "phone"):
            tenant_kwargs["phone"] = "5550001111"

        return Tenant.objects.create(**tenant_kwargs)

    @staticmethod
    def _create_lease(Lease, *, organization, unit):
        """Create a Lease using whichever common fields exist."""
        # Step 1: base kwargs
        lease_kwargs = {
            "organization": organization,
            "unit": unit,
        }

        # Step 2: common dates
        if hasattr(Lease, "start_date"):
            lease_kwargs["start_date"] = date(2026, 1, 1)
        if hasattr(Lease, "end_date"):
            lease_kwargs["end_date"] = None

        # Step 3: common money fields
        if hasattr(Lease, "rent_amount"):
            lease_kwargs["rent_amount"] = Decimal("1200.00")
        elif hasattr(Lease, "monthly_rent"):
            lease_kwargs["monthly_rent"] = Decimal("1200.00")
        elif hasattr(Lease, "rent"):
            lease_kwargs["rent"] = Decimal("1200.00")

        if hasattr(Lease, "deposit_amount"):
            lease_kwargs["deposit_amount"] = Decimal("1200.00")
        elif hasattr(Lease, "security_deposit"):
            lease_kwargs["security_deposit"] = Decimal("1200.00")
        elif hasattr(Lease, "deposit"):
            lease_kwargs["deposit"] = Decimal("1200.00")

        # Step 4: due day
        if hasattr(Lease, "due_day"):
            lease_kwargs["due_day"] = 1
        elif hasattr(Lease, "rent_due_day"):
            lease_kwargs["rent_due_day"] = 1

        # Step 5: status (if present)
        if hasattr(Lease, "status"):
            lease_kwargs["status"] = "active"

        return Lease.objects.create(**lease_kwargs)

    def setUp(self) -> None:
        # Step 1: create user
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        # Step 2: create org
        from apps.core.models import Organization  # type: ignore

        self.org = Organization.objects.create(name="Test Org", slug="test-org")

        # Step 3: create minimal building/unit/tenant/lease to satisfy FKs
        from apps.buildings.models import Building, Unit  # type: ignore
        from apps.leases.models import Lease, Tenant  # type: ignore

        self.Unit = Unit
        self.Lease = Lease

        self.building = Building.objects.create(
            organization=self.org,
            name="123 Main",
            address_line1="123 Main St",
            city="Nowhere",
            state="NA",
            postal_code="00000",
        )

        self.unit = self._create_unit(Unit, organization=self.org, building=self.building, unit_token="1A")
        self.tenant = self._create_tenant(Tenant, organization=self.org)
        self.lease = self._create_lease(Lease, organization=self.org, unit=self.unit)

    def test_charge_amount_must_be_positive(self) -> None:
        # Step 1: invalid amount
        charge = Charge(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("0.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )

        # Step 2: DB constraint should reject on save
        with self.assertRaises(Exception):
            charge.save()

    def test_allocation_requires_same_lease(self) -> None:
        # Step 1: create valid charge + payment on lease A
        charge_a = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        payment_a = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("500.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.ZELLE,
            created_by=self.user,
        )

        # Step 2: create a DIFFERENT unit to avoid uniq_active_lease_per_unit_per_org
        unit_b = self._create_unit(
            self.Unit,
            organization=self.org,
            building=self.building,
            unit_token="1B",
        )
        lease_b = self._create_lease(self.Lease, organization=self.org, unit=unit_b)

        charge_b = Charge.objects.create(
            organization=self.org,
            lease=lease_b,
            kind=ChargeKind.RENT,
            amount=Decimal("900.00"),
            due_date=date(2026, 3, 1),
            created_by=self.user,
        )

        # Step 3: allocation using payment from lease A to charge from lease B must fail
        allocation = Allocation(
            organization=self.org,
            payment=payment_a,
            charge=charge_b,
            amount=Decimal("100.00"),
        )
        with self.assertRaises(ValidationError):
            allocation.full_clean()

        # Step 4: sanity: allocation is fine when both belong to same lease
        ok = Allocation(
            organization=self.org,
            payment=payment_a,
            charge=charge_a,
            amount=Decimal("100.00"),
        )
        ok.full_clean()  # should not raise

    def test_allocation_sum_helpers(self) -> None:
        # Step 1: create charge + payment
        charge = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("500.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        # Step 2: allocate
        Allocation.objects.create(
            organization=self.org,
            payment=payment,
            charge=charge,
            amount=Decimal("200.00"),
        )

        # Step 3: verify helper sums
        self.assertEqual(Allocation.sum_allocated_for_payment(payment.id), Decimal("200.00"))
        self.assertEqual(Allocation.sum_allocated_for_charge(charge.id), Decimal("200.00"))

