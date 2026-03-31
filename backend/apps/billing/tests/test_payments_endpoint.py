# Filename: backend/apps/billing/tests/test_payments_endpoint.py

"""
Payments endpoint tests.

Covers:
- POST /api/v1/payments/ with allocation_mode=auto (FIFO)
- POST /api/v1/payments/ with allocation_mode=manual (explicit allocations)
- Multi-tenant org isolation via X-Org-Slug

Notes:
- This suite includes small model factory helpers to adapt to differing schema
  field names across projects (Unit, Lease, and OrganizationMember metadata
  fields can vary across implementations).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment


class TestPaymentsEndpoint(APITestCase):
    """API tests for lease-scoped payment creation and allocation behavior."""

    def _field_names(self, model_class) -> set[str]:
        """
        Return the concrete field names for a Django model.

        Args:
            model_class: Django model class.

        Returns:
            set[str]: Set of field names defined on the model.
        """
        # Step 1: gather model field names
        return {field.name for field in model_class._meta.fields}

    def _choose_choice_value(
        self,
        model_class,
        *,
        field_name: str,
        preferred_values: tuple[str, ...],
    ) -> str | None:
        """
        Pick the first matching choice value for a model field.

        Args:
            model_class: Django model class.
            field_name: Model field name that may define choices.
            preferred_values: Candidate values in priority order.

        Returns:
            str | None: The first supported choice value, or None if no match
            can be found.
        """
        # Step 1: get the field
        field = model_class._meta.get_field(field_name)
        choices = getattr(field, "choices", None) or []

        if not choices:
            return None

        # Step 2: flatten choice values
        allowed_values = {str(choice_value) for choice_value, _ in choices}

        # Step 3: choose the first preferred supported value
        for value in preferred_values:
            if value in allowed_values:
                return value

        # Step 4: return nothing if no preferred value matches
        return None

    def _create_org_membership(self, OrganizationMember, *, organization, user):
        """
        Create an active organization membership for the authenticated user.

        This helper is intentionally schema-tolerant because organization
        membership models often vary by:
        - role field choices
        - active/status fields
        - invitation acceptance metadata

        Args:
            OrganizationMember: Membership model class.
            organization: Organization instance.
            user: User instance.

        Returns:
            OrganizationMember: Created membership row.
        """
        # Step 1: inspect the membership schema
        field_names = self._field_names(OrganizationMember)

        payload = {
            "organization": organization,
            "user": user,
        }

        # Step 2: set a write-capable membership role when the field exists
        if "role" in field_names:
            role_value = self._choose_choice_value(
                OrganizationMember,
                field_name="role",
                preferred_values=("owner", "admin", "manager", "member"),
            )
            if role_value is not None:
                payload["role"] = role_value

        # Step 3: set boolean active flags when present
        if "is_active" in field_names:
            payload["is_active"] = True

        if "active" in field_names:
            payload["active"] = True

        # Step 4: set membership status when present
        if "status" in field_names:
            status_value = self._choose_choice_value(
                OrganizationMember,
                field_name="status",
                preferred_values=("active", "accepted", "member", "approved"),
            )
            if status_value is not None:
                payload["status"] = status_value

        # Step 5: mark invitation acceptance when these fields exist
        if "accepted_at" in field_names:
            payload["accepted_at"] = datetime.now(timezone.utc)

        # Step 6: create the membership
        return OrganizationMember.objects.create(**payload)

    def _create_unit(self, Unit, *, organization, building, label: str):
        """
        Create a Unit using the correct identifier field for this project.

        Args:
            Unit: Unit model class.
            organization: Organization instance.
            building: Building instance.
            label: Human-readable unit label.

        Returns:
            Unit: Created unit instance.
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

        Required:
        - organization
        - unit
        - start_date
        - rent_amount

        Args:
            Lease: Lease model class.
            organization: Organization instance.
            unit: Unit instance.
            start_date: Lease start date.
            rent_amount: Monthly rent amount.

        Returns:
            Lease: Created lease instance.
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
        """
        Create the test user, organizations, memberships, and lease fixtures.
        """
        # Step 1: auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: import models
        from apps.core.models import Organization, OrganizationMember  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        # Step 3: create organizations
        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        # Step 4: create active memberships for both orgs
        #
        # We create membership in both orgs so:
        # - org-1 requests can pass membership checks and reach billing logic
        # - org-2 requests can also pass membership checks, which lets the
        #   cross-org isolation test verify that org-safe lease lookup blocks
        #   access to org-1 lease data
        self._create_org_membership(
            OrganizationMember,
            organization=self.org1,
            user=self.user,
        )
        self._create_org_membership(
            OrganizationMember,
            organization=self.org2,
            user=self.user,
        )

        # Step 5: create org-1 building/unit/lease
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

        # Step 6: create org-2 building/unit/lease
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
        """Auto allocation should apply payment to oldest open charges first."""
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
        """Manual mode should reject requests that do not include allocation rows."""
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
        """Manual mode should create the explicit allocation requested by the client."""
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
        """Org-scoped lease lookup should block paying a lease from another org."""
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