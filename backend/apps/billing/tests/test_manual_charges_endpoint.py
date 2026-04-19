"""
Manual lease charge endpoint tests.

Covers:
- POST /api/v1/leases/<lease_id>/charges/
- supported manual charge kinds:
  - late_fee
  - misc
- rejection of rent on the manual charge endpoint
- multi-tenant organization isolation via X-Org-Slug
- ledger visibility after successful charge creation

Why this file exists:
- Keeps the new manual charge workflow locked down with focused API tests.
- Preserves the architectural boundary between:
  - monthly rent generation
  - manual non-rent charge entry
- Verifies that successful manual charges appear in the lease ledger, which
  is the backend source of truth used by the frontend.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Charge, ChargeKind


class ManualLeaseChargeEndpointTests(APITestCase):
    """
    API tests for explicit manual lease charge creation.

    These tests are intentionally schema-tolerant because supporting model
    field names can vary slightly across refactors or related apps.
    """

    def _field_names(self, model_class) -> set[str]:
        """
        Return the concrete field names for a Django model.

        Args:
            model_class: Django model class.

        Returns:
            set[str]: Set of field names defined on the model.
        """
        # Step 1: Gather concrete model fields.
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
            str | None: First supported choice value, or None if no preferred
            value is supported by the model field.
        """
        # Step 1: Resolve the field metadata.
        field = model_class._meta.get_field(field_name)
        choices = getattr(field, "choices", None) or []

        if not choices:
            return None

        # Step 2: Flatten choice values.
        allowed_values = {str(choice_value) for choice_value, _ in choices}

        # Step 3: Return the first preferred supported value.
        for value in preferred_values:
            if value in allowed_values:
                return value

        return None

    def _create_org_membership(self, OrganizationMember, *, organization, user):
        """
        Create an active organization membership for the authenticated user.

        This helper is schema-tolerant because organization membership models
        often vary across projects and refactors.

        Args:
            OrganizationMember: Membership model class.
            organization: Organization instance.
            user: User instance.

        Returns:
            OrganizationMember: Created membership row.
        """
        # Step 1: Inspect the membership model shape.
        field_names = self._field_names(OrganizationMember)

        payload = {
            "organization": organization,
            "user": user,
        }

        # Step 2: Set a valid write-capable role when present.
        if "role" in field_names:
            role_value = self._choose_choice_value(
                OrganizationMember,
                field_name="role",
                preferred_values=("owner", "admin", "manager", "member"),
            )
            if role_value is not None:
                payload["role"] = role_value

        # Step 3: Mark the membership active when supported.
        if "is_active" in field_names:
            payload["is_active"] = True

        if "active" in field_names:
            payload["active"] = True

        # Step 4: Set status fields when present.
        if "status" in field_names:
            status_value = self._choose_choice_value(
                OrganizationMember,
                field_name="status",
                preferred_values=("active", "accepted", "member", "approved"),
            )
            if status_value is not None:
                payload["status"] = status_value

        # Step 5: Fill remaining required primitive fields defensively.
        for field in OrganizationMember._meta.fields:
            if field.primary_key:
                continue
            if field.name in payload:
                continue
            if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
                continue
            if field.null or field.blank or field.has_default():
                continue
            if isinstance(field, models.ForeignKey):
                continue

            if isinstance(field, models.BooleanField):
                payload[field.name] = True
            elif isinstance(field, models.CharField):
                payload[field.name] = "test"
            elif isinstance(field, models.IntegerField):
                payload[field.name] = 1
            elif isinstance(field, models.DateField):
                payload[field.name] = date(2026, 1, 1)
            else:
                raise TypeError(
                    f"OrganizationMember has required field '{field.name}' of unsupported "
                    f"type {field.__class__.__name__}. Add a test mapping."
                )

        # Step 6: Create the membership row.
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
        # Step 1: Inspect fields.
        field_names = self._field_names(Unit)

        # Step 2: Try common unit label fields.
        for field_name in ("unit_label", "label", "name", "unit_number", "number", "unit"):
            if field_name in field_names:
                return Unit.objects.create(
                    organization=organization,
                    building=building,
                    **{field_name: label},
                )

        # Step 3: Fallback if Unit has no label field.
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

        Args:
            Lease: Lease model class.
            organization: Organization instance.
            unit: Unit instance.
            start_date: Lease start date.
            rent_amount: Monthly rent amount.

        Returns:
            Lease: Created lease instance.
        """
        # Step 1: Inspect fields.
        field_names = self._field_names(Lease)

        kwargs = {
            "organization": organization,
            "unit": unit,
        }

        # Step 2: Resolve the lease start-date field.
        if "start_date" in field_names:
            kwargs["start_date"] = start_date
        elif "starts_on" in field_names:
            kwargs["starts_on"] = start_date
        else:
            raise AssertionError(
                "Lease model must have a start date field "
                "(start_date or starts_on) for these tests."
            )

        # Step 3: Resolve the rent field.
        if "rent_amount" in field_names:
            kwargs["rent_amount"] = rent_amount
        elif "rent" in field_names:
            kwargs["rent"] = rent_amount
        else:
            raise AssertionError(
                "Lease model must have a rent field "
                "(rent_amount or rent) for these tests."
            )

        # Step 4: Prefer explicit open-ended lease values when supported.
        if "end_date" in field_names:
            kwargs["end_date"] = None
        elif "ends_on" in field_names:
            kwargs["ends_on"] = None

        return Lease.objects.create(**kwargs)

    def setUp(self) -> None:
        """
        Create the authenticated user, organizations, memberships, and leases.
        """
        # Step 1: Create the authenticated user and API client.
        User = get_user_model()
        self.user = User.objects.create_user(
            email="test@example.com",
            password="pass1234",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: Import project-local models.
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.core.models import Organization, OrganizationMember  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        # Step 3: Create two organizations.
        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        # Step 4: Create active memberships in both orgs so org isolation tests
        # reach the billing layer rather than failing at membership checks.
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

        # Step 5: Create org-1 building/unit/lease fixture.
        building_1 = Building.objects.create(
            organization=self.org1,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )
        unit_1 = self._create_unit(
            Unit,
            organization=self.org1,
            building=building_1,
            label="1A",
        )
        self.lease1 = self._create_lease(
            Lease,
            organization=self.org1,
            unit=unit_1,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("1200.00"),
        )

        # Step 6: Create org-2 building/unit/lease fixture for isolation tests.
        building_2 = Building.objects.create(
            organization=self.org2,
            name="B2",
            address_line1="2 B St",
            city="X",
            state="Y",
            postal_code="00000",
        )
        unit_2 = self._create_unit(
            Unit,
            organization=self.org2,
            building=building_2,
            label="2A",
        )
        self.lease2 = self._create_lease(
            Lease,
            organization=self.org2,
            unit=unit_2,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("900.00"),
        )

    def test_create_late_fee_charge_returns_201(self) -> None:
        """
        The endpoint should create a late-fee charge for the active org lease.
        """
        # Step 1: Call the manual charge endpoint as org-1.
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")

        payload = {
            "kind": "late_fee",
            "amount": "75.00",
            "due_date": "2026-04-20",
            "notes": "April late fee",
        }

        response = self.client.post(
            f"/api/v1/leases/{self.lease1.id}/charges/",
            payload,
            format="json",
        )

        # Step 2: Assert a created response and response contract basics.
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()

        self.assertEqual(body["lease_id"], self.lease1.id)
        self.assertEqual(body["kind"], "late_fee")
        self.assertEqual(body["amount"], "75.00")
        self.assertEqual(body["due_date"], "2026-04-20")
        self.assertEqual(body["notes"], "April late fee")
        self.assertIn("created_at", body)

        # Step 3: Assert the persisted charge row exists.
        self.assertTrue(
            Charge.objects.filter(
                id=body["id"],
                organization=self.org1,
                lease=self.lease1,
                kind=ChargeKind.LATE_FEE,
                amount=Decimal("75.00"),
                due_date=date(2026, 4, 20),
            ).exists()
        )

    def test_create_misc_charge_returns_201(self) -> None:
        """
        The endpoint should create a misc charge for the active org lease.
        """
        # Step 1: Call the manual charge endpoint as org-1.
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")

        payload = {
            "kind": "misc",
            "amount": "25.00",
            "due_date": "2026-04-22",
            "notes": "Key replacement",
        }

        response = self.client.post(
            f"/api/v1/leases/{self.lease1.id}/charges/",
            payload,
            format="json",
        )

        # Step 2: Assert create success.
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()

        self.assertEqual(body["kind"], "misc")
        self.assertEqual(body["amount"], "25.00")
        self.assertEqual(body["due_date"], "2026-04-22")
        self.assertEqual(body["notes"], "Key replacement")

        # Step 3: Assert persistence.
        self.assertTrue(
            Charge.objects.filter(
                id=body["id"],
                organization=self.org1,
                lease=self.lease1,
                kind=ChargeKind.MISC,
                amount=Decimal("25.00"),
                due_date=date(2026, 4, 22),
            ).exists()
        )

    def test_manual_charge_endpoint_rejects_rent(self) -> None:
        """
        The endpoint should reject rent because rent must use the dedicated
        monthly charge-generation workflow.
        """
        # Step 1: Attempt to create a rent charge through the manual endpoint.
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")

        payload = {
            "kind": "rent",
            "amount": "1200.00",
            "due_date": "2026-04-01",
            "notes": "Should be rejected",
        }

        response = self.client.post(
            f"/api/v1/leases/{self.lease1.id}/charges/",
            payload,
            format="json",
        )

        # Step 2: Assert validation failure and no charge creation.
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(
            Charge.objects.filter(
                organization=self.org1,
                lease=self.lease1,
                kind=ChargeKind.RENT,
                due_date=date(2026, 4, 1),
            ).count(),
            0,
        )

    def test_cannot_create_manual_charge_against_other_org_lease(self) -> None:
        """
        Org-scoped lease lookup should block creating a charge on a lease owned
        by another organization.
        """
        # Step 1: Use org-2 scope but target org-1 lease.
        self.client.credentials(HTTP_X_ORG_SLUG="org-2")

        payload = {
            "kind": "late_fee",
            "amount": "50.00",
            "due_date": "2026-04-25",
            "notes": "Cross-org attempt",
        }

        response = self.client.post(
            f"/api/v1/leases/{self.lease1.id}/charges/",
            payload,
            format="json",
        )

        # Step 2: Assert access is blocked.
        self.assertIn(response.status_code, (403, 404), response.content)

    def test_created_manual_charge_appears_in_lease_ledger(self) -> None:
        """
        After successful manual charge creation, the lease ledger endpoint
        should return the new charge as part of the backend-derived source of
        truth.
        """
        # Step 1: Create a manual charge through the public endpoint.
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")

        create_payload = {
            "kind": "late_fee",
            "amount": "85.00",
            "due_date": "2026-04-21",
            "notes": "Returned payment fee",
        }

        create_response = self.client.post(
            f"/api/v1/leases/{self.lease1.id}/charges/",
            create_payload,
            format="json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.content)

        created_body = create_response.json()
        charge_id = created_body["id"]

        # Step 2: Fetch the lease ledger.
        ledger_response = self.client.get(
            f"/api/v1/leases/{self.lease1.id}/ledger/",
            format="json",
        )
        self.assertEqual(ledger_response.status_code, 200, ledger_response.content)

        ledger_body = ledger_response.json()
        charges = ledger_body["charges"]

        # Step 3: Assert the new charge is visible in the ledger rows.
        matching_rows = [
            row for row in charges
            if row["id"] == charge_id and row["kind"] == "late_fee"
        ]
        self.assertEqual(len(matching_rows), 1)

        # Step 4: Assert the ledger totals moved upward.
        totals = ledger_body["totals"]
        self.assertEqual(totals["total_charges"], "85.00")
        self.assertEqual(totals["outstanding_balance"], "85.00")