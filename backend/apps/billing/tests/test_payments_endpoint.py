# Filename: apps/billing/tests/test_payments_endpoint.py

"""
Payments endpoint tests.

Covers:
- POST /api/v1/payments/ with allocation_mode=auto (FIFO)
- POST /api/v1/payments/ with allocation_mode=manual (explicit allocations)
- Multi-tenant org isolation via X-Org-Slug

Notes:
- This suite includes small model factory helpers to adapt to differing schema
  field names across projects (Unit and Lease label/metadata fields vary).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment


class PaymentsEndpointTests(APITestCase):
    def _field_names(self, Model) -> set[str]:
        # Step 1: gather model field names
        return {f.name for f in Model._meta.fields}

    def _create_unit(self, Unit, *, organization, building, label: str):
        """
        Create a Unit using the correct identifier field for this project.
        """
        # Step 1: inspect fields
        field_names = self._field_names(Unit)

        # Step 2: try common unit label fields
        for field_name in ("unit_label", "label", "name", "unit_number", "number", "unit"):
            if field_name in field_names:
                return Unit.objects.create(
                    organization=organization,
                    building=building,
                    **{field_name: label},
                )

        # Step 3: fallback if Unit has no label field
        return Unit.objects.create(organization=organization, building=building)

    def _create_lease(
        self,
        Lease,
        *,
        organization,
        unit,
        start_date: date,
        rent_amount: Decimal,
    ):
        """
        Create a Lease with only fields that exist in this project.

        Required (by design for these tests):
        - organization
        - unit
        - start_date
        - rent_amount

        Optional fields vary across schemas (deposit_amount, due_day, end_date, etc.).
        """
        # Step 1: inspect fields
        field_names = self._field_names(Lease)

        # Step 2: build kwargs safely
        kwargs = {
            "organization": organization,
            "unit": unit,
        }

        # Step 3: start_date naming can vary
        if "start_date" in field_names:
            kwargs["start_date"] = start_date
        elif "starts_on" in field_names:
            kwargs["starts_on"] = start_date
        else:
            raise AssertionError(
                "Lease model must have a start date field (start_date or starts_on) for these tests."
            )

        # Step 4: rent amount naming can vary
        if "rent_amount" in field_names:
            kwargs["rent_amount"] = rent_amount
        elif "rent" in field_names:
            kwargs["rent"] = rent_amount
        else:
            raise AssertionError(
                "Lease model must have a rent field (rent_amount or rent) for these tests."
            )

        # Step 5: end_date is optional; prefer explicit None if field exists
        if "end_date" in field_names:
            kwargs["end_date"] = None
        elif "ends_on" in field_names:
            kwargs["ends_on"] = None

        # Step 6: create the lease
        return Lease.objects.create(**kwargs)

    def setUp(self) -> None:
        # Step 1: auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: orgs + leases
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        b1 = Building.objects.create(
            organization=self.org1,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )
        u1 = self._create_unit(Unit, organization=self.org1, building=b1, label="1A")
        self.lease1 = self._create_lease(
            Lease,
            organization=self.org1,
            unit=u1,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("1200.00"),
        )

        b2 = Building.objects.create(
            organization=self.org2,
            name="B2",
            address_line1="2 B St",
            city="X",
            state="Y",
            postal_code="00000",
        )
        u2 = self._create_unit(Unit, organization=self.org2, building=b2, label="2A")
        self.lease2 = self._create_lease(
            Lease,
            organization=self.org2,
            unit=u2,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("900.00"),
        )

    def test_create_payment_auto_allocates_fifo(self) -> None:
        # Step 1: create two charges (Feb then Mar)
        c_feb = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
        )
        c_mar = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 3, 1),
        )

        # Step 2: POST payment 1500 (auto FIFO)
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        payload = {
            "lease_id": self.lease1.id,
            "amount": "1500.00",
            "paid_at": datetime(2026, 2, 5, tzinfo=timezone.utc).isoformat(),
            "method": "cash",
            "allocation_mode": "auto",
        }
        res = self.client.post("/api/v1/payments/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.content)

        # Step 3: assert payment exists
        body = res.json()
        payment_id = body["payment_id"]
        self.assertTrue(
            Payment.objects.filter(
                id=payment_id,
                organization=self.org1,
                lease=self.lease1,
            ).exists()
        )

        # Step 4: assert FIFO allocations: 1200 -> Feb, 300 -> Mar
        allocs = Allocation.objects.filter(payment_id=payment_id).order_by("id")
        self.assertEqual(allocs.count(), 2)

        self.assertEqual(allocs[0].charge_id, c_feb.id)
        self.assertEqual(allocs[0].amount, Decimal("1200.00"))

        self.assertEqual(allocs[1].charge_id, c_mar.id)
        self.assertEqual(allocs[1].amount, Decimal("300.00"))

        # Step 5: response includes totals
        self.assertEqual(Decimal(body["allocated_total"]), Decimal("1500.00"))
        self.assertEqual(Decimal(body["unapplied_amount"]), Decimal("0.00"))

    def test_create_payment_manual_requires_allocations(self) -> None:
        # Step 1: manual mode without allocations -> 400
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        payload = {
            "lease_id": self.lease1.id,
            "amount": "500.00",
            "paid_at": datetime(2026, 2, 5, tzinfo=timezone.utc).isoformat(),
            "method": "cash",
            "allocation_mode": "manual",
        }
        res = self.client.post("/api/v1/payments/", payload, format="json")
        self.assertEqual(res.status_code, 400, res.content)

    def test_create_payment_manual_allocates_exact(self) -> None:
        # Step 1: create a charge
        charge = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 2, 1),
        )

        # Step 2: manual payment allocates 800 to that charge
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        payload = {
            "lease_id": self.lease1.id,
            "amount": "800.00",
            "paid_at": datetime(2026, 2, 6, tzinfo=timezone.utc).isoformat(),
            "method": "zelle",
            "allocation_mode": "manual",
            "allocations": [
                {"charge_id": charge.id, "amount": "800.00"},
            ],
        }
        res = self.client.post("/api/v1/payments/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.content)

        body = res.json()
        payment_id = body["payment_id"]

        allocs = Allocation.objects.filter(payment_id=payment_id)
        self.assertEqual(allocs.count(), 1)
        self.assertEqual(allocs[0].charge_id, charge.id)
        self.assertEqual(allocs[0].amount, Decimal("800.00"))

        self.assertEqual(Decimal(body["allocated_total"]), Decimal("800.00"))
        self.assertEqual(Decimal(body["unapplied_amount"]), Decimal("0.00"))

    def test_cannot_create_payment_against_other_org_lease(self) -> None:
        # Step 1: org2 header but try to pay org1 lease -> 403/404
        self.client.credentials(HTTP_X_ORG_SLUG="org-2")
        payload = {
            "lease_id": self.lease1.id,
            "amount": "100.00",
            "paid_at": datetime(2026, 2, 5, tzinfo=timezone.utc).isoformat(),
            "method": "cash",
            "allocation_mode": "auto",
        }
        res = self.client.post("/api/v1/payments/", payload, format="json")
        self.assertIn(res.status_code, (403, 404), res.content)
