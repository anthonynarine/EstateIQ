

"""
Vendor ViewSet definitions for the expenses domain.

This module owns CRUD-lite endpoints for organization-scoped vendors.
"""

from __future__ import annotations

from rest_framework import mixins, viewsets

from apps.expenses.selectors import list_vendors
from apps.expenses.serializers import VendorSerializer
from apps.expenses.views.mixins import OrganizationScopedViewMixin


class VendorViewSet(
    OrganizationScopedViewMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet for vendor CRUD-lite endpoints."""

    serializer_class = VendorSerializer

    def get_queryset(self):
        """Return the org-scoped vendor queryset."""
        # Step 1: Start with strict org scoping.
        organization = self._get_request_organization()
        queryset = list_vendors(organization=organization)

        # Step 2: Support explicit active filtering and management override.
        is_active = self._parse_bool_query_param(
            self.request.query_params.get("is_active")
        )
        include_inactive = self._parse_bool_query_param(
            self.request.query_params.get("include_inactive")
        )

        vendor_type = self.request.query_params.get("vendor_type")
        search = (self.request.query_params.get("search") or "").strip()

        # Step 3: Default to active-only unless the caller explicitly asks
        # for inactive records to be included.
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        elif include_inactive is not True:
            queryset = queryset.filter(is_active=True)

        # Step 4: Apply remaining lookup filters.
        if vendor_type:
            queryset = queryset.filter(vendor_type=vendor_type)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        """Create a vendor while enforcing request organization."""
        organization = self._get_request_organization()
        serializer.save(organization=organization)