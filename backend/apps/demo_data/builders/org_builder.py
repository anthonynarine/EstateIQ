# Filename: backend/apps/demo_data/builders/org_builder.py

from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.core.models import Organization, OrganizationMember
from apps.demo_data.constants import (
    DEMO_OWNER_EMAIL,
    DEMO_OWNER_FIRST_NAME,
    DEMO_OWNER_LAST_NAME,
    DEMO_OWNER_PASSWORD,
    DEMO_ORG_NAME,
    DEMO_ORG_SLUG,
)

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.users.models import CustomUser


UserModel = get_user_model()


@dataclass(frozen=True)
class DemoOrgBuildResult:
    """Structured result for demo org bootstrap."""

    user_id: int
    organization_id: int
    membership_id: int


class DemoOrgBuilder:
    """Create or update the deterministic demo owner, org, and membership."""

    @classmethod
    @transaction.atomic
    def build(cls) -> DemoOrgBuildResult:
        """Create or reconcile the demo owner, organization, and membership.

        Returns:
            DemoOrgBuildResult: Primary keys for the created or reused records.
        """
        # Step 1: create or update the demo owner user
        user = cls._build_demo_owner()

        # Step 2: create or update the demo organization
        organization = cls._build_demo_organization()

        # Step 3: create or update the owner membership
        membership = cls._build_demo_membership(
            user_id=user.id,
            organization_id=organization.id,
        )

        return DemoOrgBuildResult(
            user_id=user.id,
            organization_id=organization.id,
            membership_id=membership.id,
        )

    @staticmethod
    def _build_demo_owner() -> "CustomUser":
        """Create or reconcile the deterministic demo owner user.

        Returns:
            CustomUser: Demo owner user instance.
        """
        # Step 1: get or create by stable email identity
        user, created = UserModel.objects.get_or_create(
            email=DEMO_OWNER_EMAIL,
            defaults={
                "first_name": DEMO_OWNER_FIRST_NAME,
                "last_name": DEMO_OWNER_LAST_NAME,
                "is_active": True,
            },
        )

        # Step 2: keep the identity deterministic across reruns
        dirty_fields: list[str] = []

        if user.first_name != DEMO_OWNER_FIRST_NAME:
            user.first_name = DEMO_OWNER_FIRST_NAME
            dirty_fields.append("first_name")

        if user.last_name != DEMO_OWNER_LAST_NAME:
            user.last_name = DEMO_OWNER_LAST_NAME
            dirty_fields.append("last_name")

        if hasattr(user, "account_status") and user.account_status != "active":
            user.account_status = "active"
            dirty_fields.append("account_status")

        if not user.is_active:
            user.is_active = True
            dirty_fields.append("is_active")

        # Step 3: always reset to the known demo password
        user.set_password(DEMO_OWNER_PASSWORD)
        dirty_fields.append("password")

        if created:
            user.save()
        else:
            user.save(update_fields=dirty_fields)

        return user

    @staticmethod
    def _build_demo_organization() -> Organization:
        """Create or reconcile the deterministic demo organization.

        Returns:
            Organization: Demo organization instance.
        """
        # Step 1: get or create by stable slug
        organization, _ = Organization.objects.get_or_create(
            slug=DEMO_ORG_SLUG,
            defaults={
                "name": DEMO_ORG_NAME,
                "is_active": True,
                "default_timezone": "America/New_York",
                "currency": "USD",
            },
        )

        # Step 2: keep the organization deterministic across reruns
        dirty_fields: list[str] = []

        if organization.name != DEMO_ORG_NAME:
            organization.name = DEMO_ORG_NAME
            dirty_fields.append("name")

        if not organization.is_active:
            organization.is_active = True
            dirty_fields.append("is_active")

        if organization.default_timezone != "America/New_York":
            organization.default_timezone = "America/New_York"
            dirty_fields.append("default_timezone")

        if organization.currency != "USD":
            organization.currency = "USD"
            dirty_fields.append("currency")

        if dirty_fields:
            organization.save(update_fields=dirty_fields)

        return organization

    @staticmethod
    def _build_demo_membership(
        *,
        user_id: int,
        organization_id: int,
    ) -> OrganizationMember:
        """Create or reconcile the demo owner's org membership.

        Args:
            user_id: Demo owner user primary key.
            organization_id: Demo organization primary key.

        Returns:
            OrganizationMember: Active owner membership.
        """
        # Step 1: get or create the membership edge
        membership, _ = OrganizationMember.objects.get_or_create(
            user_id=user_id,
            organization_id=organization_id,
            defaults={
                "role": OrganizationMember.Role.OWNER,
                "status": OrganizationMember.Status.ACTIVE,
                "is_active": True,
            },
        )

        # Step 2: normalize the membership into the desired owner state
        dirty_fields: list[str] = []

        if membership.role != OrganizationMember.Role.OWNER:
            membership.role = OrganizationMember.Role.OWNER
            dirty_fields.append("role")

        if membership.status != OrganizationMember.Status.ACTIVE:
            membership.status = OrganizationMember.Status.ACTIVE
            dirty_fields.append("status")

        if not membership.is_active:
            membership.is_active = True
            dirty_fields.append("is_active")

        if dirty_fields:
            membership.save(update_fields=dirty_fields)

        return membership