# Filename: apps/billing/tests/test_org_dashboard_summary.py

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod


class OrgDashboardSummaryTests(APITestCase):
    def setUp(self) -> None:
        # Step 1: auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: org + building + unit + lease
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.org = Organization.objects.create(name="Org", slug="org-1")

        building = Building.objects.create(
            organization=self.org,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )

        # Step 3: Unit identifier field is `label`
        unit = Unit.objects.create(
            organization=self.org,
            building=building,
            label="1A",
            bedrooms=1,
            bathrooms=1,
            sqft=650,
        )

        # Step 4: Create lease using only fields that exist (schema-safe)
        lease_field_names = {f.name for f in Lease._meta.fields}

        lease_kwargs = {
            "organization": self.org,
            "unit": unit,
        }

        # Step 5: start/end dates (most schemas have these)
        if "start_date" in lease_field_names:
            lease_kwargs["start_date"] = date(2026, 1, 1)
        if "end_date" in lease_field_names:
            lease_kwargs["end_date"] = None

        # Step 6: rent amount field name varies (handle common variants)
        rent_value = Decimal("1200.00")
        if "rent_amount" in lease_field_names:
            lease_kwargs["rent_amount"] = rent_value
        elif "rent" in lease_field_names:
            lease_kwargs["rent"] = rent_value
        elif "monthly_rent" in lease_field_names:
            lease_kwargs["monthly_rent"] = rent_value
        else:
            raise AssertionError(
                "Lease model missing expected rent field (rent_amount/rent/monthly_rent). "
                f"Fields: {sorted(lease_field_names)}"
            )

        # Step 7: deposit + due-day fields are optional; set only if they exist
        if "deposit_amount" in lease_field_names:
            lease_kwargs["deposit_amount"] = Decimal("1200.00")
        if "deposit" in lease_field_names:
            lease_kwargs["deposit"] = Decimal("1200.00")

        if "due_day" in lease_field_names:
            lease_kwargs["due_day"] = 1
        if "rent_due_day" in lease_field_names:
            lease_kwargs["rent_due_day"] = 1
        if "due_date_day" in lease_field_names:
            lease_kwargs["due_date_day"] = 1

        self.lease = Lease.objects.create(**lease_kwargs)

    def test_dashboard_summary_metrics(self) -> None:
        # Step 1: as_of in March
        as_of = date(2026, 3, 15)

        # Step 2: March rent due -> expected
        march_charge = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 3, 1),
        )

        # Step 3: payment 800 applied to March rent
        payment = Payment.objects.create(
            organization=self.org,
            lease=self.lease,
            amount=Decimal("800.00"),
            paid_at=datetime(2026, 3, 5, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
        )
        Allocation.objects.create(
            organization=self.org,
            payment=payment,
            charge=march_charge,
            amount=Decimal("800.00"),
        )

        # Step 4: call endpoint
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        res = self.client.get(f"/api/v1/reports/dashboard-summary/?as_of={as_of.isoformat()}")

        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Step 5: assert metrics
        self.assertEqual(data["as_of"], as_of.isoformat())
        self.assertEqual(Decimal(data["expected_rent_this_month"]), Decimal("1200.00"))
        self.assertEqual(Decimal(data["collected_this_month"]), Decimal("800.00"))
        self.assertEqual(Decimal(data["outstanding_as_of"]), Decimal("400.00"))
        self.assertEqual(data["delinquent_leases_count"], 1)
        self.assertEqual(Decimal(data["unapplied_credits_total"]), Decimal("0.00"))
