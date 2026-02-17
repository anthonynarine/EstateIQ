# Filename: apps/buildings/tests/test_org_isolation.py
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.buildings.models import Building
from apps.core.models import Organization, OrganizationMember

User = get_user_model()


class TestOrgIsolationBuildings(TestCase):
    def setUp(self):
        # Step 1: orgs
        self.org_a = Organization.objects.create(name="Org A", slug="org-a")
        self.org_b = Organization.objects.create(name="Org B", slug="org-b")

        # Step 2: users
        self.user_a = User.objects.create_user(email="a@example.com", password="pass12345")
        self.user_b = User.objects.create_user(email="b@example.com", password="pass12345")
        
        # Step 3: memberships
        role_value = getattr(getattr(OrganizationMember, "Role", None), "ADMIN", "admin")
        OrganizationMember.objects.create(
            user=self.user_a, organization=self.org_a, role=role_value
        )
        OrganizationMember.objects.create(
            user=self.user_b, organization=self.org_b, role=role_value
        )

        # Step 4: buildings
        self.building_a = Building.objects.create(
            organization=self.org_a,
            name="A Building",
        )
        self.building_b = Building.objects.create(
            organization=self.org_b,
            name="B Building",
        )

        # Step 5: api client
        self.client = APIClient()

    def test_user_cannot_read_other_org_building(self):
        # Step 1: auth as Org A user + scope header to org-a
        self.client.force_authenticate(user=self.user_a)

        # Step 2: request Org B building while scoped to Org A
        resp = self.client.get(
            f"/api/v1/buildings/{self.building_b.id}/",
            HTTP_X_ORG_SLUG=self.org_a.slug,
        )

        # Step 3: should be 404 (no tenant existence leak)
        self.assertEqual(resp.status_code, 404)

    def test_user_cannot_create_unit_under_other_org_building(self):
        # Step 1: auth as Org A user + scope to Org A
        self.client.force_authenticate(user=self.user_a)

        # Step 2: attempt to create unit attached to Org B building
        payload = {"building": self.building_b.id, "label": "1A"}
        resp = self.client.post(
            "/api/v1/units/",
            payload,
            format="json",
            HTTP_X_ORG_SLUG=self.org_a.slug,
        )

        # Step 3: rejected (400 from serializer validate_building OR 404 if you hide it)
        self.assertIn(resp.status_code, [400, 404])
