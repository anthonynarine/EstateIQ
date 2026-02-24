# Filename: backend/apps/buildings/views.py
from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from apps.buildings import selectors, services
from apps.buildings.serializers import BuildingSerializer, UnitSerializer
from shared.auth.permissions import IsOrgMember
from apps.leases import selectors as lease_selectors
from apps.leases.serializers import LeaseSerializer


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
    ordering_fields = ["label", "bedrooms", "bathrooms", "sqft", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Step 1: org-scoped queryset (already select_related("building") in selector)
        return selectors.units_qs_for_org(org=self.request.org)

    def perform_create(self, serializer):
        """Create a unit via the service layer (org-safe)."""
        # Step 1: create via service using validated data
        instance = services.create_unit(
            org=self.request.org,
            data=serializer.validated_data,
        )

        # Step 2: attach instance so DRF returns the created record
        serializer.instance = instance

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