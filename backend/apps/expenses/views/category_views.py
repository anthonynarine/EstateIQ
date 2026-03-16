"""
Category ViewSet definitions for the expenses domain.

This module owns CRUD-lite endpoints for organization-scoped expense categories.
"""

from __future__ import annotations

from rest_framework import mixins, viewsets

from apps.expenses.selectors import list_expense_categories
from apps.expenses.serializers import ExpenseCategorySerializer
from apps.expenses.views.mixins import OrganizationScopedViewMixin


class ExpenseCategoryViewSet(
    OrganizationScopedViewMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet for expense category CRUD-lite endpoints."""

    serializer_class = ExpenseCategorySerializer

    def get_queryset(self):
        """Return the org-scoped category queryset."""
        organization = self._get_request_organization()
        queryset = list_expense_categories(organization=organization)

        is_active = self._parse_bool_query_param(
            self.request.query_params.get("is_active")
        )
        kind = self.request.query_params.get("kind")
        search = self.request.query_params.get("search")

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)

        if kind:
            queryset = queryset.filter(kind=kind)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        """Create a category while enforcing request organization."""
        organization = self._get_request_organization()
        serializer.save(organization=organization)