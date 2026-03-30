# Filename: backend/apps/billing/tests/test_generate_current_month_charge_endpoint.py

from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import models
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Charge, ChargeKind


class GenerateCurrentMonthChargeEndpointTests(APITestCase):
    def _field_names(self, Model) -> set[str]:
        # Step 1: gather model field names
        return {f.name for f in Model._meta.fields}

    def _create_unit(self, Unit, *, organization, building, label: str):
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

        # Step 3: fallback
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
        # Step 1: inspect fields
        field_names = self._field_names(Lease)

        kwargs = {"organization": organization, "unit": unit}

        # Step 2: start date field varies
        if "start_date" in field_names:
            kwargs["start_date"] = start_date
        elif "starts_on" in field_names:
            kwargs["starts_on"] = start_date
        else:
            raise AssertionError("Lease must have start_date or starts_on for this test.")

        # Step 3: rent field varies
        if "rent_amount" in field_names:
            kwargs["rent_amount"] = rent_amount
        elif "rent" in field_names:
            kwargs["rent"] = rent_amount
        else:
            raise AssertionError("Lease must have rent_amount or rent for this test.")

        # Step 4: optional end date
        if "end_date" in field_names:
            kwargs["end_date"] = None
        elif "ends_on" in field_names:
            kwargs["ends_on"] = None

        return Lease.objects.create(**kwargs)

    def _create_org_membership(self, OrganizationMember, *, organization, user) -> None:
        """
        Create an active organization membership in a schema-resilient way.

        This helper avoids hardcoding the exact OrganizationMember field set.
        It fills common required fields such as role and active flags when
        present and uses a safe fallback for any remaining required primitives.
        """
        # Step 1: start with the required relations we know
        kwargs = {
            "organization": organization,
            "user": user,
        }

        field_names = {field.name for field in OrganizationMember._meta.fields}

        # Step 2: set a valid role when the schema requires one
        if "role" in field_names:
            role_field = OrganizationMember._meta.get_field("role")
            role_choices = []
            if getattr(role_field, "choices", None):
                role_choices = [choice[0] for choice in role_field.choices]

            if "owner" in role_choices:
                kwargs["role"] = "owner"
            elif role_choices:
                kwargs["role"] = role_choices[0]

        # Step 3: mark the membership active when the schema supports it
        if "is_active" in field_names:
            kwargs["is_active"] = True
        elif "active" in field_names:
            kwargs["active"] = True

        # Step 4: fill any remaining required non-relational primitive fields
        for field in OrganizationMember._meta.fields:
            if field.primary_key:
                continue
            if field.name in kwargs:
                continue
            if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
                continue
            if field.null or field.blank or field.has_default():
                continue
            if isinstance(field, models.ForeignKey):
                continue

            if isinstance(field, models.BooleanField):
                kwargs[field.name] = True
            elif isinstance(field, models.CharField):
                kwargs[field.name] = "test"
            elif isinstance(field, models.IntegerField):
                kwargs[field.name] = 1
            elif isinstance(field, models.DateField):
                kwargs[field.name] = date(2026, 1, 1)
            else:
                raise TypeError(
                    f"OrganizationMember has required field '{field.name}' of unsupported type "
                    f"{field.__class__.__name__}. Add a test mapping."
                )

        # Step 5: create the membership row
        OrganizationMember.objects.create(**kwargs)

    def setUp(self) -> None:
        # Step 1: auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: org + membership + lease
        from apps.core.models import Organization, OrganizationMember  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        # Step 3: create active memberships for both orgs so tests exercise
        # org isolation instead of failing at the permission layer
        self._create_org_membership(OrganizationMember, organization=self.org1, user=self.user)
        self._create_org_membership(OrganizationMember, organization=self.org2, user=self.user)

        # Step 4: create lease fixture in org1
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

    @patch("apps.billing.views.lease_charge_views.date")
    def test_generate_current_month_is_idempotent(self, mock_date) -> None:
        # Step 1: freeze today so test is deterministic
        mock_date.today.return_value = date(2026, 3, 15)
        mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        url = f"/api/v1/leases/{self.lease1.id}/charges/generate-current-month/"

        # Step 2: first call creates
        r1 = self.client.post(url, {}, format="json")
        self.assertEqual(r1.status_code, 200, r1.content)
        body1 = r1.json()
        self.assertTrue(body1["created"])

        # Step 3: second call returns existing
        r2 = self.client.post(url, {}, format="json")
        self.assertEqual(r2.status_code, 200, r2.content)
        body2 = r2.json()
        self.assertFalse(body2["created"])
        self.assertEqual(body1["charge_id"], body2["charge_id"])

        # Step 4: ensure only one charge exists for that due_date
        self.assertEqual(
            Charge.objects.filter(
                organization_id=self.org1.id,
                lease_id=self.lease1.id,
                kind=ChargeKind.RENT,
                due_date=body1["due_date"],
            ).count(),
            1,
        )

    @patch("apps.billing.views.lease_charge_views.date")
    def test_org_isolation_returns_404_or_403(self, mock_date) -> None:
        # Step 1: freeze today
        mock_date.today.return_value = date(2026, 3, 15)
        mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

        # Step 2: org2 tries to generate for org1 lease -> 404/403
        self.client.credentials(HTTP_X_ORG_SLUG="org-2")
        url = f"/api/v1/leases/{self.lease1.id}/charges/generate-current-month/"
        res = self.client.post(url, {}, format="json")
        self.assertIn(res.status_code, (403, 404), res.content)