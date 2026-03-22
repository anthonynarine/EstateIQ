# Filename: apps/expenses/views/category_views.py

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
    """ViewSet for org-scoped expense category CRUD-lite endpoints."""

    serializer_class = ExpenseCategorySerializer

    def get_queryset(self):
        """Return the filtered org-scoped category queryset."""
        # Step 1: Start with strict org scoping.
        organization = self._get_request_organization()
        queryset = list_expense_categories(organization=organization)

        # Step 2: Default lookup behavior to active-only.
        is_active = self._parse_bool_query_param(
            self.request.query_params.get("is_active")
        )
        include_inactive = self._parse_bool_query_param(
            self.request.query_params.get("include_inactive")
        )

        kind = self.request.query_params.get("kind")
        search = (self.request.query_params.get("search") or "").strip()

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        elif include_inactive is not True:
            queryset = queryset.filter(is_active=True)

        if kind:
            queryset = queryset.filter(kind=kind)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        """Create a category while enforcing request organization."""
        organization = self._get_request_organization()
        serializer.save(organization=organization)