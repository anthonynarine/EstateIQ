# Filename: backend/apps/leases/tests/test_org_isolation.py
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model  # ✅ New Code
from rest_framework.test import APIClient, APITestCase

from apps.buildings.models import Building, Unit
from apps.core.models import Organization, OrganizationMember
from apps.leases.models import Lease, Tenant

User = get_user_model()  # ✅ New Code


class TestLeasesOrgIsolation(APITestCase):
    def setUp(self):
        # Step 1: orgs
        self.org_a = Organization.objects.create(name="Org A", slug="org-a")
        self.org_b = Organization.objects.create(name="Org B", slug="org-b")

        # Step 2: users
        self.user_a = User.objects.create_user(email="a@test.com", password="pass1234")
        self.user_b = User.objects.create_user(email="b@test.com", password="pass1234")

        # Step 3: memberships
        OrganizationMember.objects.create(
            organization=self.org_a,
            user=self.user_a,
            role="owner",
        )
        OrganizationMember.objects.create(
            organization=self.org_b,
            user=self.user_b,
            role="owner",
        )

        # Step 4: buildings/units
        building_a = Building.objects.create(
            organization=self.org_a,
            name="A Building",
            building_type="house",
        )
        building_b = Building.objects.create(
            organization=self.org_b,
            name="B Building",
            building_type="house",
        )

        self.unit_a = Unit.objects.create(organization=self.org_a, building=building_a, label="1A")
        self.unit_b = Unit.objects.create(organization=self.org_b, building=building_b, label="1B")

        # Step 5: tenant + lease in org B
        self.tenant_b = Tenant.objects.create(organization=self.org_b, full_name="Tenant B")
        self.lease_b = Lease.objects.create(
            organization=self.org_b,
            unit=self.unit_b,
            start_date=date(2026, 1, 1),
            rent_amount=Decimal("1000.00"),
            rent_due_day=1,
            status=Lease.Status.ACTIVE,
        )

        # Step 6: auth client for user A (SimpleJWT)
        self.client_a = APIClient()
        token_url = "/api/v1/auth/token/"
        resp = self.client_a.post(
            token_url,
            {"email": "a@test.com", "password": "pass1234"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        access = resp.data["access"]

        self.client_a.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access}",
            HTTP_X_ORG_SLUG="org-a",
        )

    def test_org_a_cannot_read_org_b_tenant(self):
        resp = self.client_a.get("/api/v1/tenants/")
        self.assertEqual(resp.status_code, 200)
        ids = [row["id"] for row in resp.data]
        self.assertNotIn(self.tenant_b.id, ids)

        resp = self.client_a.get(f"/api/v1/tenants/{self.tenant_b.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_org_a_cannot_create_lease_on_org_b_unit(self):
        payload = {
            "unit": self.unit_b.id,
            "start_date": "2026-02-01",
            "end_date": None,
            "rent_amount": "1500.00",
            "security_deposit_amount": "500.00",
            "rent_due_day": 1,
            "status": "active",
            "parties": [],
        }
        resp = self.client_a.post("/api/v1/leases/", payload, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("unit", resp.data)

    def test_org_a_cannot_patch_org_b_lease(self):
        resp = self.client_a.patch(
            f"/api/v1/leases/{self.lease_b.id}/",
            {"rent_amount": "2000.00"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_org_a_cannot_delete_org_b_lease(self):
        resp = self.client_a.delete(f"/api/v1/leases/{self.lease_b.id}/")
        self.assertEqual(resp.status_code, 404)
        
    def test_org_a_cannot_read_org_b_tenant(self):
        # Step 1: list tenants (paginated)
        resp = self.client_a.get("/api/v1/tenants/")
        self.assertEqual(resp.status_code, 200)

        results = resp.data.get("results", resp.data)  # ✅ New Code (supports non-paginated too)
        ids = [row["id"] for row in results]
        self.assertNotIn(self.tenant_b.id, ids)

        # Step 2: retrieve org b tenant by id (should 404)
        resp = self.client_a.get(f"/api/v1/tenants/{self.tenant_b.id}/")
        self.assertEqual(resp.status_code, 404)