# # Filename: backend/apps/users/models.py
from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class AccountStatus(models.TextChoices):
    """
    Account status enum for access control.

    ACTIVE:
        Standard account state.
    SUSPENDED:
        Account exists but API access should be blocked (without deletion).
    """

    ACTIVE = "active", _("Active")
    SUSPENDED = "suspended", _("Suspended")


class CustomUser(AbstractUser):
    """
    PortfolioOS user identity model (minimal + enterprise-safe).

    Design principles:
        - Email is the unique login identifier (no username).
        - Avoid app-specific fields (no game stats, no tenant fields).
        - Keep Django admin compatibility.
        - Use account_status to block access safely.

    Tenant boundary:
        - Multi-tenant scoping is enforced via apps.core.OrganizationMember.
        - Do NOT store current org, org role, or org slug on the user model.
    """

    # Step 1: Remove username and rely on email
    username = None

    email = models.EmailField(
        _("email address"),
        unique=True,
        db_index=True,
        help_text=_("Unique login identifier. Used for authentication and communication."),
    )

    first_name = models.CharField(
        _("first name"),
        max_length=150,
        blank=True,
        default="",
        help_text=_("Optional. Useful for admin and UI display."),
    )
    last_name = models.CharField(
        _("last name"),
        max_length=150,
        blank=True,
        default="",
        help_text=_("Optional. Useful for admin and UI display."),
    )

    account_status = models.CharField(
        _("account status"),
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        help_text=_("Set to 'suspended' to block API access without deleting the user."),
    )

    # Step 2: Configure auth behavior
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = CustomUserManager()

    @property
    def is_suspended(self) -> bool:
        """
        Whether the user is suspended.

        Returns:
            bool: True if account_status is SUSPENDED.
        """
        return self.account_status == AccountStatus.SUSPENDED

    def __str__(self) -> str:
        """Human-friendly identity string for admin and logs."""
        return self.email
