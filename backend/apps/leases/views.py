# Filename: apps/leases/views.py

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from apps.leases import selectors
from apps.leases.serializers import (
    LeaseEndSerializer,
    LeaseSerializer,
    TenantDetailSerializer,
    TenantDirectorySerializer,
    TenantWriteSerializer,
)
from shared.auth.permissions import IsOrgMember


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for tenants plus read-model serializers for directory/detail views."""

    permission_classes = [IsOrgMember]
    filter_backends = [OrderingFilter]
    ordering_fields = ["full_name", "created_at", "id"]
    ordering = ["full_name", "id"]

    def get_queryset(self):
        """Return the correct tenant queryset for the current action."""
        # Step 1: Use the detail selector for retrieve
        if self.action == "retrieve":
            return selectors.tenant_detail_qs(org=self.request.org)

        # Step 2: Apply list-only search filtering for the tenant directory
        if self.action == "list":
            return selectors.tenants_qs(
                org=self.request.org,
                search=self.request.query_params.get("search"),
            )

        # Step 3: Use the canonical tenant selector for write actions/object lookup
        return selectors.tenants_qs(org=self.request.org)

    def get_serializer_class(self):
        """Return an action-appropriate serializer."""
        # Step 1: Tenant directory list
        if self.action == "list":
            return TenantDirectorySerializer

        # Step 2: Tenant detail page
        if self.action == "retrieve":
            return TenantDetailSerializer

        # Step 3: Tenant write flows
        return TenantWriteSerializer


class LeaseViewSet(viewsets.ModelViewSet):
    """CRUD for leases (org-scoped, multi-tenant safe)."""

    permission_classes = [IsOrgMember]
    serializer_class = LeaseSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["start_date", "created_at", "rent_amount", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = selectors.leases_qs(org=self.request.org)

        unit_id = self.request.query_params.get("unit")
        if unit_id:
            qs = qs.filter(unit_id=unit_id)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    @action(detail=False, methods=["get"], url_path=r"by-unit/(?P<unit_id>[^/.]+)")
    def by_unit(self, request, unit_id=None):
        qs = self.get_queryset().filter(unit_id=unit_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="end")
    def end(self, request, pk=None):
        """End a lease by setting a concrete move-out date (end-exclusive)."""
        lease = self.get_object()

        serializer = LeaseEndSerializer(
            data=request.data,
            context={"request": request, "lease": lease},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        return Response(
            LeaseSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )