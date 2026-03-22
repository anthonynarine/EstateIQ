
"""
Category serializers for the expenses domain.

These serializers support CRUD-style category endpoints while still exposing
display-friendly labels for the frontend.
"""

from __future__ import annotations

from django.utils.text import slugify
from rest_framework import serializers

from apps.expenses.models import ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Full serializer for category CRUD endpoints."""

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "organization",
            "name",
            "slug",
            "parent",
            "kind",
            "kind_label",
            "description",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "slug",
            "created_at",
            "updated_at",
            "kind_label",
        ]

    def __init__(self, *args, **kwargs):
        """Restrict parent choices to the current organization."""
        super().__init__(*args, **kwargs)

        organization = self._get_request_organization()
        queryset = ExpenseCategory.objects.none()

        if organization is not None:
            queryset = ExpenseCategory.objects.filter(organization=organization)

        self.fields["parent"].queryset = queryset

    def validate_name(self, value: str) -> str:
        """Validate and normalize category name.

        Args:
            value: Raw category name from the request.

        Returns:
            Normalized category name in title case.

        Raises:
            serializers.ValidationError: If the name is invalid or duplicated.
        """
        # Step 1: Normalize whitespace.
        normalized_value = " ".join(value.strip().split())

        if not normalized_value:
            raise serializers.ValidationError("Category name cannot be blank.")

        # Step 2: Normalize display formatting for clean reporting labels.
        normalized_value = normalized_value.title()

        organization = self._get_target_organization()

        queryset = ExpenseCategory.objects.filter(
            organization=organization,
            name__iexact=normalized_value,
        )

        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A category with this name already exists in this organization."
            )

        return normalized_value

    def validate_description(self, value: str) -> str:
        """Normalize category description without changing user-authored casing.

        Args:
            value: Raw category description.

        Returns:
            Trimmed description text.
        """
        # Step 1: Preserve sentence meaning while cleaning whitespace.
        return value.strip()

    def validate_parent(
        self,
        value: ExpenseCategory | None,
    ) -> ExpenseCategory | None:
        """Ensure the parent category belongs to the same organization.

        Args:
            value: Proposed parent category.

        Returns:
            The validated parent category.

        Raises:
            serializers.ValidationError: If the parent is invalid.
        """
        if value is None:
            return value

        organization = self._get_target_organization()

        if value.organization_id != organization.id:
            raise serializers.ValidationError(
                "Parent category must belong to the current organization."
            )

        if self.instance is not None and value.pk == self.instance.pk:
            raise serializers.ValidationError(
                "A category cannot be its own parent."
            )

        return value

    def create(self, validated_data: dict) -> ExpenseCategory:
        """Create an org-scoped category with a server-generated slug.

        Args:
            validated_data: Serializer-validated payload.

        Returns:
            ExpenseCategory: The created category.
        """
        # Step 1: Resolve the org from request context.
        organization = self._get_target_organization()

        # Step 2: Generate a stable org-unique slug on the server.
        validated_data["slug"] = self._generate_unique_slug(
            organization=organization,
            name=validated_data["name"],
        )

        return super().create(validated_data)

    def _get_request_organization(self):
        """Return the request organization from serializer context."""
        request = self.context.get("request")

        if request is None:
            return None

        return getattr(request, "organization", None) or getattr(
            request,
            "org",
            None,
        )

    def _get_target_organization(self):
        """Return the organization for this serializer operation."""
        if self.instance is not None:
            return self.instance.organization

        organization = self._get_request_organization()

        if organization is None:
            raise serializers.ValidationError(
                "No organization was resolved for this request."
            )

        return organization

    def _generate_unique_slug(self, *, organization, name: str) -> str:
        """Generate an org-unique slug for a category.

        Args:
            organization: The owning organization.
            name: The normalized category name.

        Returns:
            str: Unique slug value.

        Raises:
            serializers.ValidationError: If a slug cannot be generated.
        """
        # Step 1: Build a base slug from the normalized category name.
        base_slug = slugify(name)

        if not base_slug:
            raise serializers.ValidationError(
                {"name": "Category name must contain letters or numbers."}
            )

        slug_candidate = base_slug
        suffix = 2

        while ExpenseCategory.objects.filter(
            organization=organization,
            slug=slug_candidate,
        ).exists():
            slug_candidate = f"{base_slug}-{suffix}"
            suffix += 1

        return slug_candidate