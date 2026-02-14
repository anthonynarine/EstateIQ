# # Filename: backend/apps/users/serializers.py
from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    """
    User registration serializer.

    Important:
        - Registration creates a user only.
        - Org membership is handled by apps.core (invites / onboarding later).
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
        help_text="Password is write-only and will be stored hashed.",
    )

    class Meta:
        model = CustomUser
        fields = ("id", "email", "first_name", "last_name", "password")

    def validate_password(self, value: str) -> str:
        # Step 1: Apply Django's configured password validators
        validate_password(value)
        return value

    def create(self, validated_data):
        # Step 1: Use manager to ensure consistent email validation/normalization
        return CustomUser.objects.create_user(**validated_data)


class MeSerializer(serializers.ModelSerializer):
    """
    Serializer for /auth/me/ response.

    Returns:
        - Minimal user profile
        - The caller's own org memberships (org + role list)

    Security:
        - This does NOT return any org-owned domain data.
        - Memberships are safe to return because they belong to the authenticated user.
    """

    memberships = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ("id", "email", "first_name", "last_name", "account_status", "memberships")

    def get_memberships(self, obj: CustomUser):
        # Step 1: Local import to avoid circular dependencies
        from apps.core.models import OrganizationMember

        # Step 2: Return memberships for this user only
        qs = (
            OrganizationMember.objects.select_related("organization")
            .filter(user=obj)
            .order_by("organization__name")
        )

        return [
            {
                "org_id": str(m.organization_id),
                "org_name": m.organization.name,
                "org_slug": m.organization.slug,
                "role": m.role,
            }
            for m in qs
        ]
