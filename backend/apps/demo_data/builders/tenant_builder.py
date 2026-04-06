# Filename: backend/apps/demo_data/builders/tenant_builder.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db import transaction

from apps.core.models import Organization
from apps.demo_data.scenarios import DEMO_TENANT_SCENARIOS
from apps.leases.models import Tenant


@dataclass(frozen=True)
class DemoTenantBuildResult:
    """Structured result for seeded tenant references."""

    tenant_ids_by_code: dict[str, int]


class DemoTenantBuilder:
    """Create or reconcile the deterministic tenant roster."""

    @classmethod
    @transaction.atomic
    def build(
        cls,
        *,
        organization_id: int,
    ) -> DemoTenantBuildResult:
        """Create or reconcile demo tenants for an organization."""
        # Step 1: verify the organization exists
        organization = Organization.objects.get(id=organization_id)

        tenant_ids_by_code: dict[str, int] = {}

        # Step 2: build the configured tenant roster
        for tenant_scenario in DEMO_TENANT_SCENARIOS:
            tenant = cls._build_tenant(
                organization=organization,
                scenario=tenant_scenario,
            )
            tenant_ids_by_code[tenant_scenario["code"]] = tenant.id

        return DemoTenantBuildResult(
            tenant_ids_by_code=tenant_ids_by_code,
        )

    @staticmethod
    def _build_tenant(
        *,
        organization: Organization,
        scenario: dict[str, Any],
    ) -> Tenant:
        """Create or reconcile one tenant from a scenario definition."""
        # Step 1: get or create by org + email
        tenant, _ = Tenant.objects.get_or_create(
            organization=organization,
            email=scenario["email"],
            defaults={
                "full_name": scenario["full_name"],
                "phone": scenario["phone"],
            },
        )

        # Step 2: keep the tenant deterministic across reruns
        dirty_fields: list[str] = []

        if tenant.full_name != scenario["full_name"]:
            tenant.full_name = scenario["full_name"]
            dirty_fields.append("full_name")

        if tenant.phone != scenario["phone"]:
            tenant.phone = scenario["phone"]
            dirty_fields.append("phone")

        if dirty_fields:
            tenant.save(update_fields=dirty_fields)

        return tenant