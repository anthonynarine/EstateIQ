# Filename: apps/billing/tests/test_rent_posting_run_current_month.py

from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Charge, ChargeKind


class RentPostingRunCurrentMonthTests(APITestCase):
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

    def _create_lease(self, Lease, *, organization, unit, start_date: date, rent_amount: Decimal):
        # Step 1: inspect fields
        field_names = self._field_names(Lease)

        kwargs = {"organization": organization, "unit": unit}

        # Step 2: start date field varies
        if "start_date" in field_names:
            kwargs["start_date"] = start_date
        elif "starts_on" in field_names:
            kwargs["starts_on"] = start_date
        else:
            raise AssertionError("Lease must have start_date or starts_on.")

        # Step 3: rent field varies
        if "rent_amount" in field_names:
            kwargs["rent_amount"] = rent_amount
        elif "rent" in field_names:
            kwargs["rent"] = rent_amount
        else:
            raise AssertionError("Lease must have rent_amount or rent.")

        # Step 4: optional end date
        if "end_date" in field_names:
            kwargs["end_date"] = None
        elif "ends_on" in field_names:
            kwargs["ends_on"] = None

        return Lease.objects.create(**kwargs)

    def setUp(self) -> None:
        # Step 1: auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: org + 2 leases
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.org = Organization.objects.create(name="Org 1", slug="org-1")

        b = Building.objects.create(
            organization=self.org,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )

        u1 = self._create_unit(Unit, organization=self.org, building=b, label="1A")
        u2 = self._create_unit(Unit, organization=self.org, building=b, label="2A")

        self.lease1 = self._create_lease(
            Lease,
            organization=self.org,
            unit=u1,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("1200.00"),
        )
        self.lease2 = self._create_lease(
            Lease,
            organization=self.org,
            unit=u2,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("900.00"),
        )

    @patch("apps.billing.views.date")
    def test_run_current_month_creates_charges_and_is_idempotent(self, mock_date) -> None:
        # Step 1: freeze server date
        mock_date.today.return_value = date(2026, 3, 15)
        mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        url = "/api/v1/reports/rent-posting/run-current-month/"

        # Step 2: first run creates two rent charges
        r1 = self.client.post(url, {}, format="json")
        self.assertEqual(r1.status_code, 200, r1.content)
        body1 = r1.json()

        self.assertEqual(body1["leases_processed"], 2)
        self.assertEqual(body1["charges_created"], 2)

        # Step 3: second run should find existing charges
        r2 = self.client.post(url, {}, format="json")
        self.assertEqual(r2.status_code, 200, r2.content)
        body2 = r2.json()

        self.assertEqual(body2["charges_created"], 0)
        self.assertEqual(body2["charges_existing"], 2)

        # Step 4: sanity check at least one rent charge per lease exists
        self.assertTrue(
            Charge.objects.filter(
                organization=self.org,
                lease_id=self.lease1.id,
                kind=ChargeKind.RENT,
            ).exists()
        )
        self.assertTrue(
            Charge.objects.filter(
                organization=self.org,
                lease_id=self.lease2.id,
                kind=ChargeKind.RENT,
            ).exists()
        )
