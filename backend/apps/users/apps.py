# # Filename: backend/apps/users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    """
    Users application configuration.

    This app owns identity (authentication + user profile).
    Tenant scoping is owned by apps.core via Organization + OrganizationMember.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Users"
