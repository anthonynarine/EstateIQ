# Filename: backend/apps/core/models.py

# Step 1: core multi-tenant models (Organization + Membership)
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


class Organization(models.Model):
    """
    Organization is the primary tenant boundary for EstateIQ.

    Every domain object that belongs to a customer (buildings, units, leases,
    ledger entries, reports, AI logs) must be scoped to exactly one Organization.

    Design goals:
      - Prevent cross-tenant access by construction.
      - Enable multi-user collaboration within a tenant (owner/manager/accountant).
      - Provide stable identifiers for routing, logging, and auditing.
    """

    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=255,
        unique=True,
        help_text="URL-safe unique identifier for the organization.",
    )

    # Helper fields (purposeful, not financial truth)
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-disable org access without deleting data.",
    )
    default_timezone = models.CharField(
        max_length=64,
        default="America/New_York",
        help_text="Default timezone used for reporting periods and UI display.",
    )
    currency = models.CharField(
        max_length=3,
        default="USD",
        help_text="ISO-4217 currency code for reporting (MVP: USD).",
    )

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


class OrganizationMember(models.Model):
    """
    OrganizationMember links a user to an organization with a role.

    This model exists so the system can:
      - enforce tenant isolation (user must be a member of org to access org data)
      - enforce role-based permissions (who can mutate ledger vs view only)
      - support audit logging with "who performed this action" grounded in org role

    Note:
      - A user can belong to multiple organizations.
      - Membership can be deactivated without deleting historical records.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"
        ACCOUNTANT = "accountant", "Accountant"
        READ_ONLY = "read_only", "Read Only"

    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="org_memberships",
    )

    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        help_text="Role determines allowed actions within the organization.",
    )

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text="Membership lifecycle state (invited/active/suspended).",
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft-disable membership without deleting historical records.",
    )

    # Helper fields (useful for onboarding + auditability)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="org_invites_sent",
        help_text="User who invited this member (if applicable).",
    )
    invited_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the invitation was created.",
    )
    joined_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
        help_text="Timestamp when membership became active.",
    )
    last_seen_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional: last time the user used the org (good for admin UX).",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="uniq_member_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "user"]),
            models.Index(fields=["organization", "role"]),
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.organization.slug} ({self.role})"

    # Step 2: permission helpers (clean, centralized)
    @property
    def is_owner(self) -> bool:
        """Return True if the member is an organization owner."""
        return self.role == self.Role.OWNER

    @property
    def can_manage_properties(self) -> bool:
        """Return True if the member can manage buildings/units/leases."""
        return self.role in {self.Role.OWNER, self.Role.MANAGER}

    @property
    def can_write_ledger(self) -> bool:
        """
        Return True if the member can create/modify ledger-adjacent records.

        MVP assumption:
          - Owner + Manager can record charges/payments/expenses.
          - Accountant is view/export (write later if you introduce journal entries).
        """
        return self.role in {self.Role.OWNER, self.Role.MANAGER}

    @property
    def can_view_reports(self) -> bool:
        """Return True if the member can view portfolio reports."""
        return self.role in {
            self.Role.OWNER,
            self.Role.MANAGER,
            self.Role.ACCOUNTANT,
            self.Role.READ_ONLY,
        }
