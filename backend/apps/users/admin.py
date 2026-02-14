# # Filename: backend/apps/users/admin.py
from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Django admin configuration for email-based user model.

    Notes:
        - Keeps session auth / admin functionality intact.
        - Exposes account_status for quick suspension workflows.
    """

    model = CustomUser
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "account_status", "is_staff", "is_active")
    list_filter = ("account_status", "is_staff", "is_active", "is_superuser")
    search_fields = ("email", "first_name", "last_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("first_name", "last_name")}),
        ("Access Control", {"fields": ("account_status", "is_active", "is_staff", "is_superuser")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "is_staff", "is_superuser")}),
    )
