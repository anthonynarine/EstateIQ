# Filename: apps/billing/tests/test_allocation_service.py

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod
from apps.billing.services.allocation_service import AllocationRequest, AllocationService


class AllocationServiceTests(TestCase):
    def setUp(self) -> None:
        # Step 1: create user
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        # Step 2: create orgs
        from apps.core.models import Organization  # noqa: WPS433

        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.other_org = Organization.objects.create(name="Other Org", slug="other-org")

        # Step 3: fixture counters + caches
        self._unit_counter = 0
        self._building_by_org_id: dict[int, object] = {}

        # Step 4: create leases
        self.lease = self._create_lease_for_org(self.org)
        self.lease2 = self._create_lease_for_org(self.org)
        self.lease_other_org = self._create_lease_for_org(self.other_org)

    def _next_unit_label(self) -> str:
        # Step 1: increment counter
        self._unit_counter += 1
        return f"U{self._unit_counter:03d}"

    def _get_or_create_building(self, org):
        """Return a unique building per org for test fixtures."""
        # Step 1: return cached building if present
        if org.id in self._building_by_org_id:
            return self._building_by_org_id[org.id]

        # Step 2: create and cache building (unique per org)
        from apps.buildings.models import Building  # noqa: WPS433

        building = Building.objects.create(
            organization=org,
            name=f"Building-{org.slug}-primary",  # unique per org (created once)
            address_line1="123 Main St",
            city="Nowhere",
            state="NA",
            postal_code="00000",
        )
        self._building_by_org_id[org.id] = building
        return building

    def _create_lease_for_org(self, org):
        # Step 1: imports
        from apps.buildings.models import Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        # Step 2: building (reused per org)
        building = self._get_or_create_building(org)

        # Step 3: unit (unique label required)
        unit = Unit.objects.create(
            organization=org,
            building=building,
            label=self._next_unit_label(),
        )

        # Step 4: lease (do not assume deposit_amount/due_day exist)
        lease = Lease.objects.create(
            organization=org,
            unit=unit,
            start_date=date(2026, 1, 1),
            end_date=None,
            rent_amount=Decimal("1200.00"),
        )
        return lease

    def test_auto_allocation_fifo_across_multiple_charges(self) -> None:
        charge1 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        charge2 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 3, 1),
            created_by=self.user,
        )

        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("1500.00"),
            paid_at=datetime(2026, 3, 5, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        result = AllocationService.allocate_payment_auto(payment.id)

        allocs = list(Allocation.objects.filter(payment=payment).order_by("id"))
        self.assertEqual(len(allocs), 2)
        self.assertEqual(allocs[0].charge_id, charge1.id)
        self.assertEqual(allocs[0].amount, Decimal("1200.00"))
        self.assertEqual(allocs[1].charge_id, charge2.id)
        self.assertEqual(allocs[1].amount, Decimal("300.00"))

        self.assertEqual(result.allocated_total, Decimal("1500.00"))
        self.assertEqual(result.unapplied_amount, Decimal("0.00"))

    def test_auto_allocation_leaves_unapplied_when_no_open_charges(self) -> None:
        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("500.00"),
            paid_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        result = AllocationService.allocate_payment_auto(payment.id)

        self.assertEqual(Allocation.objects.filter(payment=payment).count(), 0)
        self.assertEqual(result.allocated_total, Decimal("0.00"))
        self.assertEqual(result.unapplied_amount, Decimal("500.00"))

    def test_auto_allocation_is_idempotent_when_payment_fully_allocated(self) -> None:
        Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )

        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("100.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.ZELLE,
            created_by=self.user,
        )

        AllocationService.allocate_payment_auto(payment.id)
        second = AllocationService.allocate_payment_auto(payment.id)

        self.assertEqual(Allocation.objects.filter(payment=payment).count(), 1)
        self.assertEqual(second.allocation_ids, [])

    def test_manual_allocation_creates_exact_allocations(self) -> None:
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
            kind=ChargeKind.LATE_FEE,
            amount=Decimal("50.00"),
            due_date=date(2026, 2, 10),
            created_by=self.user,
        )

        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("300.00"),
            paid_at=datetime(2026, 2, 11, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        result = AllocationService.allocate_payment_manual(
            payment.id,
            requests=[
                AllocationRequest(charge_id=c2.id, amount=Decimal("50.00")),
                AllocationRequest(charge_id=c1.id, amount=Decimal("250.00")),
            ],
        )

        allocs = list(Allocation.objects.filter(payment=payment).order_by("id"))
        self.assertEqual(len(allocs), 2)
        self.assertEqual(result.unapplied_amount, Decimal("0.00"))

    def test_manual_allocation_rejects_over_payment_amount(self) -> None:
        c1 = Charge.objects.create(
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
            amount=Decimal("100.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            AllocationService.allocate_payment_manual(
                payment.id,
                requests=[AllocationRequest(charge_id=c1.id, amount=Decimal("150.00"))],
            )

    def test_manual_allocation_rejects_over_charge_balance(self) -> None:
        c1 = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
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

        with self.assertRaises(ValidationError):
            AllocationService.allocate_payment_manual(
                payment.id,
                requests=[AllocationRequest(charge_id=c1.id, amount=Decimal("150.00"))],
            )

    def test_manual_allocation_rejects_cross_lease_charge(self) -> None:
        other_charge = Charge.objects.create(
            organization=self.org,
            lease=self.lease2,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("100.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            AllocationService.allocate_payment_manual(
                payment.id,
                requests=[AllocationRequest(charge_id=other_charge.id, amount=Decimal("10.00"))],
            )

    def test_manual_allocation_rejects_cross_org_charge(self) -> None:
        other_charge = Charge.objects.create(
            organization=self.other_org,
            lease=self.lease_other_org,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
            due_date=date(2026, 2, 1),
            created_by=self.user,
        )
        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("100.00"),
            paid_at=datetime(2026, 2, 2, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            AllocationService.allocate_payment_manual(
                payment.id,
                requests=[AllocationRequest(charge_id=other_charge.id, amount=Decimal("10.00"))],
            )
