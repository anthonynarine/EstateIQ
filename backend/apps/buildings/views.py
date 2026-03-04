# ✅ New Code
from __future__ import annotations

from django.db.models import Count, F, IntegerField, OuterRef, QuerySet, Subquery, Value, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from apps.buildings import selectors, services
from apps.buildings.models import Unit
from apps.buildings.serializers import BuildingSerializer, UnitSerializer
from apps.leases import selectors as lease_selectors
from apps.leases.models import Lease
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
        org = self.request.org
        qs = selectors.buildings_qs_for_org(org=org)
        today = timezone.localdate()

        units_count_sq = (
            Unit.objects.filter(organization=org, building_id=OuterRef("pk"))
            .values("building_id")
            .annotate(c=Count("id"))
            .values("c")
        )

        occupied_units_count_sq = (
            Lease.objects.filter(
                organization=org,
                unit__building_id=OuterRef("pk"),
                status=Lease.Status.ACTIVE,
                start_date__lte=today,
            )
            # end_date is exclusive => GT (not GTE)
            .filter(Q(end_date__isnull=True) | Q(end_date__gt=today))
            .values("unit__building_id")
            .annotate(c=Count("unit_id", distinct=True))
            .values("c")
        )

        return qs.annotate(
            units_count=Coalesce(Subquery(units_count_sq), Value(0), output_field=IntegerField()),
            occupied_units_count=Coalesce(
                Subquery(occupied_units_count_sq), Value(0), output_field=IntegerField()
            ),
        ).annotate(
            vacant_units_count=Coalesce(F("units_count"), Value(0))
            - Coalesce(F("occupied_units_count"), Value(0))
        )

    def perform_create(self, serializer):
        instance = services.create_building(
            org=self.request.org,
            data=serializer.validated_data,
        )
        serializer.instance = instance


class UnitViewSet(viewsets.ModelViewSet):
    """CRUD for units (org-scoped)."""

    permission_classes = [IsOrgMember]
    serializer_class = UnitSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["label", "bedrooms", "bathrooms", "sqft", "created_at", "updated_at", "id"]
    ordering = ["id"]

    def get_queryset(self) -> QuerySet[Unit]:
        org = self.request.org
        qs = selectors.units_qs_for_org(org=org).order_by("id")

        building_param = self.request.query_params.get("building")
        if building_param:
            try:
                building_id = int(building_param)
            except (TypeError, ValueError):
                return qs.none()
            return qs.filter(building_id=building_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.org)

    def perform_update(self, serializer):
        if "building" in serializer.validated_data:
            incoming_building = serializer.validated_data.get("building")
            current_unit = self.get_object()
            if incoming_building and incoming_building.id != current_unit.building_id:
                raise ValidationError({"building": "Building cannot be changed after unit creation."})

        instance = services.update_unit(
            org=self.request.org,
            instance=self.get_object(),
            data=serializer.validated_data,
        )
        serializer.instance = instance

    def destroy(self, request, *args, **kwargs):
        unit = self.get_object()
        org = request.org
        today = timezone.localdate()

        has_active_lease = (
            Lease.objects.filter(
                organization=org,
                unit=unit,
                status=Lease.Status.ACTIVE,
                start_date__lte=today,
            )
            # end_date is exclusive => GT (not GTE)
            .filter(Q(end_date__isnull=True) | Q(end_date__gt=today))
            .exists()
        )

        if has_active_lease:
            return Response(
                {"detail": "Cannot delete a unit with an active lease. End the lease first."},
                status=status.HTTP_409_CONFLICT,
            )

        has_any_lease_history = Lease.objects.filter(organization=org, unit=unit).exists()
        if has_any_lease_history:
            return Response(
                {"detail": "Cannot delete a unit that has lease history. Archive it instead."},
                status=status.HTTP_409_CONFLICT,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"], url_path="leases")
    def leases(self, request, pk=None):
        unit = self.get_object()
        qs = lease_selectors.leases_qs(org=request.org).filter(unit=unit)
        serializer = LeaseSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)