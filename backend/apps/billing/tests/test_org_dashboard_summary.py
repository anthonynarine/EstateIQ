# Filename: backend/apps/billing/tests/test_org_dashboard_summary.py

"""
Organization dashboard summary endpoint tests.

Covers:
- GET /api/v1/reports/dashboard-summary/
- org-scoped access enforcement via X-Org-Slug
- summary metric correctness for a simple billed-and-partially-paid lease

Why this file exists:
- Verifies that the dashboard endpoint returns correct financial metrics.
- Ensures the test fixture mirrors production org membership requirements.
- Keeps the reporting surface trustworthy before frontend integration.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.billing.models import Allocation, Charge, ChargeKind, Payment, PaymentMethod


def _field_names(model_class: type[Any]) -> set[str]:
    """
    Return concrete Django model field names for the provided model class.

    Args:
        model_class: Django model class to inspect.

    Returns:
        set[str]: Concrete model field names.
    """
    # Step 1: inspect model metadata
    return {field.name for field in model_class._meta.fields}


def create_active_org_membership(*, user: Any, organization: Any, role: str = "owner") -> Any:
    """
    Create an active organization membership using the schema available in this project.

    This helper is intentionally defensive because organization membership
    models vary slightly between projects. Common variations include:
    - `organization` vs `org`
    - `user` vs `member`
    - `is_active` vs `status`

    Args:
        user: User instance to attach to the organization.
        organization: Organization instance for the membership.
        role: Membership role to assign when supported.

    Returns:
        Any: Created OrganizationMember instance.

    Raises:
        AssertionError: If the membership model does not expose the expected
            organization/user relation fields.
    """
    # Step 1: import the membership model locally to keep this helper test-scoped
    from apps.core.models import OrganizationMember  # noqa: WPS433

    field_names = _field_names(OrganizationMember)
    payload: dict[str, object] = {}

    # Step 2: map the organization relation safely
    if "organization" in field_names:
        payload["organization"] = organization
    elif "org" in field_names:
        payload["org"] = organization
    else:
        raise AssertionError(
            "OrganizationMember must expose an `organization` or `org` field."
        )

    # Step 3: map the user relation safely
    if "user" in field_names:
        payload["user"] = user
    elif "member" in field_names:
        payload["member"] = user
    else:
        raise AssertionError(
            "OrganizationMember must expose a `user` or `member` field."
        )

    # Step 4: set the role when the schema supports it
    if "role" in field_names:
        payload["role"] = role

    # Step 5: mark the membership active when the schema supports it
    if "is_active" in field_names:
        payload["is_active"] = True

    if "status" in field_names:
        try:
            status_field = OrganizationMember._meta.get_field("status")
            valid_status_values = {
                choice[0] for choice in getattr(status_field, "choices", []) or []
            }

            if "active" in valid_status_values:
                payload["status"] = "active"
            elif "ACTIVE" in valid_status_values:
                payload["status"] = "ACTIVE"
        except Exception:
            # Step 6: stay resilient if the status field is custom or unusual
            pass

    # Step 7: create and return the membership
    return OrganizationMember.objects.create(**payload)


class OrgDashboardSummaryTests(APITestCase):
    """Test suite for the organization billing dashboard summary endpoint."""

    def _create_unit(
        self,
        Unit: type[Any],
        *,
        organization: Any,
        building: Any,
        label: str,
    ) -> Any:
        """
        Create a Unit using whichever identifier field exists in this project.

        Args:
            Unit: Unit model class.
            organization: Organization instance.
            building: Building instance.
            label: Desired unit label.

        Returns:
            Any: Created unit instance.
        """
        # Step 1: inspect available unit fields
        field_names = _field_names(Unit)

        # Step 2: try common unit label field names
        for field_name in ("unit_label", "label", "name", "unit_number", "number", "unit"):
            if field_name in field_names:
                return Unit.objects.create(
                    organization=organization,
                    building=building,
                    **{field_name: label},
                )

        # Step 3: fall back to the minimum viable unit shape
        return Unit.objects.create(
            organization=organization,
            building=building,
        )

    def _create_lease(
        self,
        Lease: type[Any],
        *,
        organization: Any,
        unit: Any,
        start_date: date,
        rent_amount: Decimal,
    ) -> Any:
        """
        Create a Lease using only fields that exist in this project.

        Args:
            Lease: Lease model class.
            organization: Organization instance.
            unit: Unit instance.
            start_date: Lease start date.
            rent_amount: Monthly rent amount.

        Returns:
            Any: Created lease instance.

        Raises:
            AssertionError: If the schema does not expose a supported start-date
                or rent field.
        """
        # Step 1: inspect lease fields
        lease_field_names = _field_names(Lease)

        lease_kwargs: dict[str, Any] = {
            "organization": organization,
            "unit": unit,
        }

        # Step 2: set start/end date fields safely
        if "start_date" in lease_field_names:
            lease_kwargs["start_date"] = start_date
        elif "starts_on" in lease_field_names:
            lease_kwargs["starts_on"] = start_date
        else:
            raise AssertionError(
                "Lease model missing expected start date field "
                "(start_date/starts_on)."
            )

        if "end_date" in lease_field_names:
            lease_kwargs["end_date"] = None
        elif "ends_on" in lease_field_names:
            lease_kwargs["ends_on"] = None

        # Step 3: set rent amount using the supported field name
        if "rent_amount" in lease_field_names:
            lease_kwargs["rent_amount"] = rent_amount
        elif "rent" in lease_field_names:
            lease_kwargs["rent"] = rent_amount
        elif "monthly_rent" in lease_field_names:
            lease_kwargs["monthly_rent"] = rent_amount
        else:
            raise AssertionError(
                "Lease model missing expected rent field "
                "(rent_amount/rent/monthly_rent)."
            )

        # Step 4: add optional deposit fields when present
        if "deposit_amount" in lease_field_names:
            lease_kwargs["deposit_amount"] = Decimal("1200.00")
        elif "deposit" in lease_field_names:
            lease_kwargs["deposit"] = Decimal("1200.00")

        # Step 5: add optional due-day fields when present
        if "due_day" in lease_field_names:
            lease_kwargs["due_day"] = 1
        elif "rent_due_day" in lease_field_names:
            lease_kwargs["rent_due_day"] = 1
        elif "due_date_day" in lease_field_names:
            lease_kwargs["due_date_day"] = 1

        # Step 6: create and return the lease
        return Lease.objects.create(**lease_kwargs)

    def setUp(self) -> None:
        """Create an org-safe reporting fixture for the dashboard endpoint."""
        # Step 1: authenticate a user
        User = get_user_model()
        self.user = User.objects.create_user(
            email="test@example.com",
            password="pass1234",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: import project models locally
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        # Step 3: create the organization
        self.org = Organization.objects.create(name="Org", slug="org-1")

        # Step 4: create an active membership so the report endpoint can resolve
        # org access the same way production does
        create_active_org_membership(
            user=self.user,
            organization=self.org,
            role="owner",
        )

        # Step 5: create a building
        building = Building.objects.create(
            organization=self.org,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )

        # Step 6: create a schema-safe unit
        unit = self._create_unit(
            Unit,
            organization=self.org,
            building=building,
            label="1A",
        )

        # Step 7: create a schema-safe lease
        self.lease = self._create_lease(
            Lease,
            organization=self.org,
            unit=unit,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("1200.00"),
        )

    def test_dashboard_summary_metrics(self) -> None:
        """Return correct dashboard metrics for a partially paid March charge."""
        # Step 1: choose an as-of date in March
        as_of = date(2026, 3, 15)

        # Step 2: create the expected March rent charge
        march_charge = Charge.objects.create(
            organization=self.org,
            lease=self.lease,
            kind=ChargeKind.RENT,
            amount=Decimal("1200.00"),
            due_date=date(2026, 3, 1),
        )

        # Step 3: create a partial payment and allocate it to the charge
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

        # Step 4: call the dashboard summary endpoint within the org boundary
        self.client.credentials(HTTP_X_ORG_SLUG="org-1")
        response = self.client.get(
            f"/api/v1/reports/dashboard-summary/?as_of={as_of.isoformat()}"
        )

        # Step 5: assert the response shape and financial metrics
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()

        self.assertEqual(data["as_of"], as_of.isoformat())
        self.assertEqual(
            Decimal(data["expected_rent_this_month"]),
            Decimal("1200.00"),
        )
        self.assertEqual(
            Decimal(data["collected_this_month"]),
            Decimal("800.00"),
        )
        self.assertEqual(
            Decimal(data["outstanding_as_of"]),
            Decimal("400.00"),
        )
        self.assertEqual(data["delinquent_leases_count"], 1)
        self.assertEqual(
            Decimal(data["unapplied_credits_total"]),
            Decimal("0.00"),
        )