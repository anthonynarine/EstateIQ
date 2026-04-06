# Filename: backend/apps/demo_data/seed_service.py


from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from apps.demo_data.builders.billing_builder import (
    DemoBillingBuildResult,
    DemoBillingBuilder,
)
from apps.demo_data.builders.expense_builder import ExpenseSeedBuilder
from apps.demo_data.builders.lease_builder import (
    DemoLeaseBuildResult,
    DemoLeaseBuilder,
)
from apps.demo_data.builders.org_builder import DemoOrgBuildResult, DemoOrgBuilder
from apps.demo_data.builders.property_builder import (
    DemoPropertyBuildResult,
    DemoPropertyBuilder,
)
from apps.demo_data.builders.tenant_builder import (
    DemoTenantBuildResult,
    DemoTenantBuilder,
)
from apps.demo_data.verification import (
    DemoVerificationResult,
    DemoVerificationService,
)


@dataclass(frozen=True)
class DemoSeedResult:
    """Structured result for the current demo seed pass."""

    user_id: int
    organization_id: int
    membership_id: int
    building_ids_by_code: dict[str, int]
    unit_ids_by_code: dict[str, int]
    tenant_ids_by_code: dict[str, int]
    lease_ids_by_code: dict[str, int]

    charges_created: int
    charges_existing: int
    payments_created: int
    payments_existing: int

    expense_categories_created: int
    expense_categories_reconciled: int
    expense_vendors_created: int
    expense_vendors_reconciled: int
    expenses_created: int
    expenses_reconciled: int

    verification_passed: bool
    verification_checks: list[tuple[str, bool, str]]


class DemoSeedService:
    """Top-level orchestration service for demo data seeding."""

    @classmethod
    @transaction.atomic
    def run(cls) -> DemoSeedResult:
        """Execute the current demo seed workflow."""

        # Step 1: Build the demo org, owner, and membership.
        org_result: DemoOrgBuildResult = DemoOrgBuilder.build()

        # Step 2: Build the deterministic property footprint.
        property_result: DemoPropertyBuildResult = DemoPropertyBuilder.build(
            organization_id=org_result.organization_id,
        )

        # Step 3: Build the deterministic tenant roster.
        tenant_result: DemoTenantBuildResult = DemoTenantBuilder.build(
            organization_id=org_result.organization_id,
        )

        # Step 4: Build the deterministic lease timeline.
        lease_result: DemoLeaseBuildResult = DemoLeaseBuilder.build(
            organization_id=org_result.organization_id,
            unit_ids_by_code=property_result.unit_ids_by_code,
            tenant_ids_by_code=tenant_result.tenant_ids_by_code,
        )

        # Step 5: Build deterministic billing history.
        billing_result: DemoBillingBuildResult = DemoBillingBuilder.build(
            organization_id=org_result.organization_id,
            lease_ids_by_code=lease_result.lease_ids_by_code,
            created_by_id=org_result.user_id,
        )

        # Step 6: Build deterministic expense history.
        expense_seed_context = {
            "buildings_by_code": property_result.building_ids_by_code,
            "units_by_code": property_result.unit_ids_by_code,
            "leases_by_code": lease_result.lease_ids_by_code,
        }

        expense_result = ExpenseSeedBuilder(
            organization=org_result.organization_id,
            seed_context=expense_seed_context,
            actor=org_result.user_id,
        ).build()

        # Step 7: Verify seeded assumptions after billing and expenses exist.
        verification_result = DemoVerificationService.verify(
            organization_id=org_result.organization_id,
            building_ids_by_code=property_result.building_ids_by_code,
            unit_ids_by_code=property_result.unit_ids_by_code,
            lease_ids_by_code=lease_result.lease_ids_by_code,
        )

        # Step 8: Return the merged orchestration result.
        return DemoSeedResult(
            user_id=org_result.user_id,
            organization_id=org_result.organization_id,
            membership_id=org_result.membership_id,
            building_ids_by_code=property_result.building_ids_by_code,
            unit_ids_by_code=property_result.unit_ids_by_code,
            tenant_ids_by_code=tenant_result.tenant_ids_by_code,
            lease_ids_by_code=lease_result.lease_ids_by_code,
            charges_created=billing_result.charges_created,
            charges_existing=billing_result.charges_existing,
            payments_created=billing_result.payments_created,
            payments_existing=billing_result.payments_existing,
            expense_categories_created=expense_result["categories_created"],
            expense_categories_reconciled=expense_result["categories_reconciled"],
            expense_vendors_created=expense_result["vendors_created"],
            expense_vendors_reconciled=expense_result["vendors_reconciled"],
            expenses_created=expense_result["expenses_created"],
            expenses_reconciled=expense_result["expenses_reconciled"],
            verification_passed=verification_result.passed,
            verification_checks=[
                (check.name, check.passed, check.details)
                for check in verification_result.checks
            ],
        )