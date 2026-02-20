# Filename: apps/billing/tests/test_lease_ledger_endpoint.py

"""
Endpoint tests for lease ledger.

Goal:
- Ensure multi-tenant safety: a user cannot access a lease ledger outside the
  active org boundary (X-Org-Slug).

We accept either 403 or 404 depending on your preferred leakage model:
- 404 is ideal (do not reveal existence across orgs)
- 403 is acceptable if your permission layer rejects explicitly
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Dict, Iterable, Optional

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase


def _model_field_names(model_cls: Any) -> set[str]:
    """Return a set of concrete field names for a Django model class."""
    return {f.name for f in model_cls._meta.get_fields() if getattr(f, "concrete", False)}


def _set_first_existing_field(
    *,
    model_cls: Any,
    kwargs: Dict[str, Any],
    candidates: Iterable[str],
    value: Any,
) -> Optional[str]:
    """Set the first candidate field that exists on model_cls."""
    fields = _model_field_names(model_cls)
    for name in candidates:
        if name in fields:
            kwargs[name] = value
            return name
    return None


class LeaseLedgerEndpointTests(APITestCase):
    """Ensure org scoping blocks access across organizations."""

    def setUp(self) -> None:
        # Step 1: user + auth
        User = get_user_model()
        self.user = User.objects.create_user(email="test@example.com", password="pass1234")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Step 2: imports
        from apps.core.models import Organization  # noqa: WPS433
        from apps.buildings.models import Building, Unit  # noqa: WPS433
        from apps.leases.models import Lease  # noqa: WPS433

        self.Organization = Organization
        self.Building = Building
        self.Unit = Unit
        self.Lease = Lease

        # Step 3: orgs
        self.org1 = Organization.objects.create(name="Org 1", slug="org-1")
        self.org2 = Organization.objects.create(name="Org 2", slug="org-2")

        # Step 4: build a lease in org1
        b1 = Building.objects.create(
            organization=self.org1,
            name="B1",
            address_line1="1 A St",
            city="X",
            state="Y",
            postal_code="00000",
        )

        unit_kwargs: Dict[str, Any] = {"organization": self.org1, "building": b1}
        _set_first_existing_field(
            model_cls=Unit,
            kwargs=unit_kwargs,
            candidates=["unit_label", "label", "unit_number", "number", "name", "unit"],
            value="1A",
        )
        u1 = Unit.objects.create(**unit_kwargs)

        lease_kwargs: Dict[str, Any] = {
            "organization": self.org1,
            "unit": u1,
            "start_date": date(2026, 1, 1),
            "end_date": None,
        }
        _set_first_existing_field(
            model_cls=Lease,
            kwargs=lease_kwargs,
            candidates=["rent_amount", "rent", "monthly_rent", "rent_price", "amount"],
            value=Decimal("1200.00"),
        )
        self.lease_org1 = Lease.objects.create(**lease_kwargs)

    def test_cannot_access_other_org_lease_ledger(self) -> None:
        # Step 1: set active org header to org2
        # (Your Org middleware should derive request.org from this.)
        self.client.credentials(HTTP_X_ORG_SLUG="org-2")

        # Step 2: attempt to fetch org1 lease ledger
        url = f"/api/v1/leases/{self.lease_org1.id}/ledger/"
        res = self.client.get(url)

        # Step 3: ensure request is blocked (404 preferred, 403 acceptable)
        self.assertIn(res.status_code, (403, 404))
