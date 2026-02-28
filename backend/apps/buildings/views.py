# Filename: backend/apps/buildings/views.py

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from .models import Unit
from apps.buildings import selectors, services
from apps.buildings.serializers import BuildingSerializer, UnitSerializer
from apps.leases import selectors as lease_selectors
from apps.leases.serializers import LeaseSerializer
from shared.auth.permissions import IsOrgMember


class BuildingViewSet(viewsets.ModelViewSet):
    """CRUD for buildings (org-scoped)."""

    permission_classes = [IsOrgMember]
    serializer_class = BuildingSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Step 1: org-scoped queryset
        return selectors.buildings_qs_for_org(org=self.request.org)

    def perform_create(self, serializer):
        """Create a building via the service layer.

        Why:
            - Views stay thin (I/O + auth + serializer validation)
            - Services own business rules and persistence
            - Avoids coupling services to DRF serializer objects
        """
        # Step 1: create via service using validated data only
        instance = services.create_building(
            org=self.request.org,
            data=serializer.validated_data,
        )

        # Step 2: attach instance so DRF returns the created record
        serializer.instance = instance

    def perform_update(self, serializer):
        """Update a building via the service layer (org-safe)."""
        # Step 1: update via service (instance is org-safe via queryset)
        instance = services.update_building(
            org=self.request.org,
            instance=self.get_object(),
            data=serializer.validated_data,
        )

        # Step 2: attach updated instance for the response
        serializer.instance = instance

    @action(detail=True, methods=["get"], url_path="units")
    def units(self, request, pk=None):
        """Nice-to-have: /api/v1/buildings/<id>/units/"""
        building = self.get_object()

        # Step 1: org-scoped units for this building
        qs = selectors.building_units_qs_for_org(
            org=request.org,
            building_id=building.id,
        )

        serializer = UnitSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UnitViewSet(viewsets.ModelViewSet):
    """CRUD for units (org-scoped)."""

    permission_classes = [IsOrgMember]
    serializer_class = UnitSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = [
        "label",
        "bedrooms",
        "bathrooms",
        "sqft",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Step 1: Always scope to the active org (tenant boundary)
        qs = Unit.objects.filter(organization=self.request.org)

        # Step 2: Apply optional building filter
        building_param = self.request.query_params.get("building")
        if building_param:
            try:
                building_id = int(building_param)
            except (TypeError, ValueError):
                # Defensive: invalid query param returns empty, not all units
                return qs.none()

            qs = qs.filter(building_id=building_id)

        # Step 3: Stable ordering
        return qs.order_by("id")

    def perform_create(self, serializer):
        """
        Enforce org from request.org on create.
        This prevents cross-tenant assignment attempts.
        """
        # Step 1: Org is always derived from request
        serializer.save(organization=self.request.org)

    def perform_update(self, serializer):
        """Update a unit via the service layer (org-safe)."""
        # Step 1: update via service using validated data
        instance = services.update_unit(
            org=self.request.org,
            instance=self.get_object(),
            data=serializer.validated_data,
        )

        # Step 2: attach updated instance for the response
        serializer.instance = instance

    @action(detail=True, methods=["get"], url_path="leases")
    def leases(self, request, pk=None):
        """Nice-to-have: /api/v1/units/<id>/leases/ (org-safe)."""
        unit = self.get_object()

        qs = lease_selectors.leases_qs(org=request.org).filter(unit=unit)

        serializer = LeaseSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)