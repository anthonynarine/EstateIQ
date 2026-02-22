from __future__ import annotations

from rest_framework import serializers

from apps.core.models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """Serialize Organization for API usage.

    Notes:
        - `slug` is client-readable and URL-safe.
        - Creation generally supplies `name` and optionally `slug`.
          If `slug` is omitted, we can generate it later (optional enhancement).
    """

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "is_active",
            "default_timezone",
            "currency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "created_at",
            "updated_at",
        ]