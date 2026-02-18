# Filename: backend/apps/leases/views.py
from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from apps.leases import selectors
from apps.leases.serializers import LeaseSerializer, TenantSerializer
from shared.auth.permissions import IsOrgMember


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for tenants (org-scoped, multi-tenant safe)."""

    permission_classes = [IsOrgMember]
    serializer_class = TenantSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["full_name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Step 1: org-scoped queryset
        return selectors.tenants_qs(org=self.request.org)


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
