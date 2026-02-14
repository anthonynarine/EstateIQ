# # Filename: backend/apps/users/managers.py
from __future__ import annotations

from django.contrib.auth.base_user import BaseUserManager
from django.core.validators import validate_email
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    """
    Custom user manager for email-first authentication.

    Why this exists:
        - PortfolioOS uses email as the unique login identifier.
        - We remove username entirely to reduce confusion and reduce PII surface.

    Security notes:
        - Email is normalized and validated before creation.
        - create_superuser enforces staff/superuser flags defensively.
    """

    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        """
        Create and persist a user with an email and password.

        Args:
            email: User's email address (unique).
            password: Raw password (will be hashed).
            **extra_fields: Optional model fields.

        Returns:
            CustomUser: The created user.

        Raises:
            ValueError: If email or password are missing/invalid.
        """
        # Step 1: Validate inputs
        if not email:
            raise ValueError(_("The email address must be set."))

        validate_email(email)
        email = self.normalize_email(email)

        if not password:
            raise ValueError(_("A password must be set."))

        # Step 2: Create instance
        user = self.model(email=email, **extra_fields)

        # Step 3: Hash password
        user.set_password(password)

        # Step 4: Persist
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        """
        Create and persist a superuser.

        Raises:
            ValueError: If is_staff or is_superuser are not True.
        """
        # Step 1: Enforce required flags
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        # Step 2: Create via create_user
        return self.create_user(email=email, password=password, **extra_fields)
