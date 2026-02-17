# Filename: apps/buildings/views.py

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.buildings import selectors, services
from apps.buildings.models import Building
from apps.buildings.permissions import IsBuildingOrgMember
from apps.buildings.serializers import BuildingSerializer, UnitSerializer


class BuildingViewSet(viewsets.ModelViewSet):
    """CRUD for buildings, strictly scoped to request.org."""

    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated, IsBuildingOrgMember]

    def get_queryset(self):
        # Step 1: org-scoped queryset only
        return selectors.buildings_qs_for_org(org=self.request.org)

    def perform_create(self, serializer):
        # Step 1: enforce org ownership server-side
        services.create_building(org=self.request.org, data=serializer.validated_data)

    def perform_update(self, serializer):
        # Step 1: update via service layer
        services.update_building(
            building=self.get_object(),
            data=serializer.validated_data,
        )

    @action(detail=True, methods=["get"], url_path="units")
    def units(self, request, pk=None):
        # Step 1: ensure building is org-scoped (get_object uses org-scoped queryset)
        building: Building = self.get_object()
        qs = selectors.building_units_qs_for_org(org=request.org, building_id=building.id)
        return Response(UnitSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class UnitViewSet(viewsets.ModelViewSet):
    """CRUD for units, strictly scoped to request.org."""

    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated, IsBuildingOrgMember]

    def get_queryset(self):
        # Step 1: org-scoped queryset only
        return selectors.units_qs_for_org(org=self.request.org)

    def get_serializer_context(self):
        # Step 1: provide request for validate_building
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        # Step 1: service raises DRF-safe ValidationError if needed
        services.create_unit(org=self.request.org, data=serializer.validated_data)

    def perform_update(self, serializer):
        services.update_unit(unit=self.get_object(), data=serializer.validated_data)
