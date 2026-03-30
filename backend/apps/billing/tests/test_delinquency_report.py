# Filename: backend/apps/billing/tests/test_delinquency_report.py

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod


class DelinquencyReportTests(APITestCase):
    def _build_required_kwargs(self, ModelCls, base_kwargs: dict) -> dict:
        """
        Fill required non-relational fields for a model without hardcoding schema.

        Args:
            ModelCls: Django model class.
            base_kwargs: required relationship kwargs we already know.

        Returns:
            dict suitable for ModelCls.objects.create(**kwargs)
        """
        # Step 1: start with known required kwargs
        kwargs = dict(base_kwargs)

        # Step 2: fill any other required concrete fields
        for field in ModelCls._meta.fields:
            if field.primary_key:
                continue
            if field.name in kwargs:
                continue
            if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
                continue
            if field.null or field.blank or field.has_default():
                continue

            # Skip other relations we can't auto-create here
            if isinstance(field, models.ForeignKey):
                continue

            # Step 3: safe placeholder values by field type
            if isinstance(field, models.CharField):
                kwargs[field.name] = "test"
            elif isinstance(field, models.IntegerField):
                kwargs[field.name] = 1
            elif isinstance(field, models.DecimalField):
                kwargs[field.name] = Decimal("1200.00")
            elif isinstance(field, models.BooleanField):
                kwargs[field.name] = False
            elif isinstance(field, models.DateField):
                kwargs[field.name] = date(2026, 1, 1)
            elif isinstance(field, models.DateTimeField):
                kwargs[field.name] = datetime(2026, 1, 1, tzinfo=timezone.utc)
            else:
                raise TypeError(
                    f"{ModelCls.__name__} has required field '{field.name}' of unsupported type "
                    f"{field.__class__.__name__}. Add a default mapping."
                )

        return kwargs

    def _create_org_membership(self, OrganizationMember, *, organization, user) -> None:
        """
        Create an active organization membership in a schema-resilient way.
        """
        # Step 1: start with required relations
        kwargs = {
            "organization": organization,
            "user": user,
        }

        field_names = {field.name for field in OrganizationMember._meta.fields}

        # Step 2: set role if the schema requires one
        if "role" in field_names:
            role_field = OrganizationMember._meta.get_field("role")
            role_choices = []
            if getattr(role_field, "choices", None):
                role_choices = [choice[0] for choice in role_field.choices]

            if "owner" in role_choices:
                kwargs["role"] = "owner"
            elif role_choices:
                kwargs["role"] = role_choices[0]

        # Step 3: mark membership active if supported
        if "is_active" in field_names:
            kwargs["is_active"] = True
        elif "active" in field_names:
            kwargs["active"] = True

        # Step 4: fill any remaining required primitive fields
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

        # Step 2: org + memberships + building/unit + lease
        from apps.core.models import Organization, OrganizationMember  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        # Step 3: create active memberships so tests exercise org scoping
        self._create_org_membership(OrganizationMember, organization=self.org1, user=self.user)
        self._create_org_membership(OrganizationMember, organization=self.org2, user=self.user)

        b1 = Building.objects.create(
            organization=self.org1,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )

        # Step 4: schema-resilient Unit creation
        unit_kwargs = self._build_required_kwargs(Unit, {"organization": self.org1, "building": b1})
        u1 = Unit.objects.create(**unit_kwargs)

        # Step 5: schema-resilient Lease creation
        lease_kwargs = self._build_required_kwargs(Lease, {"organization": self.org1, "unit": u1})
        self.lease1 = Lease.objects.create(**lease_kwargs)

    def test_aging_buckets_math(self) -> None:
        as_of = date(2026, 5, 1)

        c_0_30 = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
            due_date=date(2026, 4, 21),
        )
        c_31_60 = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("200.00"),
            due_date=date(2026, 3, 22),
        )
        c_61_90 = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("300.00"),
            due_date=date(2026, 2, 20),
        )
        c_90p = Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("400.00"),
            due_date=date(2026, 1, 1),
        )

        p = Payment.objects.create(
            organization=self.org1,
            lease=self.lease1,
            amount=Decimal("50.00"),
            paid_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
            method=PaymentMethod.CASH,
        )
        Allocation.objects.create(organization=self.org1, payment=p, charge=c_31_60, amount=Decimal("50.00"))

        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        res = self.client.get(f"/api/v1/reports/delinquency/?as_of={as_of.isoformat()}")

        self.assertEqual(res.status_code, 200)
        data = res.json()

        row = data["results"][0]
        buckets = row["buckets"]

        self.assertEqual(Decimal(buckets["current_0_30"]), Decimal("100.00"))
        self.assertEqual(Decimal(buckets["days_31_60"]), Decimal("150.00"))
        self.assertEqual(Decimal(buckets["days_61_90"]), Decimal("300.00"))
        self.assertEqual(Decimal(buckets["days_90_plus"]), Decimal("400.00"))
        self.assertEqual(Decimal(row["total_outstanding"]), Decimal("950.00"))
        self.assertEqual(row["oldest_due_date"], "2026-01-01")

    def test_org_isolation(self) -> None:
        Charge.objects.create(
            organization=self.org1,
            lease=self.lease1,
            kind=ChargeKind.RENT,
            amount=Decimal("100.00"),
            due_date=date(2026, 1, 1),
        )

        self.client.credentials(HTTP_X_ORG_SLUG="org-2")
        res = self.client.get("/api/v1/reports/delinquency/?as_of=2026-05-01")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["results"], [])