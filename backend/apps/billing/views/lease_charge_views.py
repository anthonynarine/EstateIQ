# Filename: backend/apps/billing/views/lease_charge_views.py

"""
Lease charge generation views for the billing domain.

This module contains endpoints responsible for generating lease-scoped rent
charges.

Why this file exists:
- Keeps charge-generation endpoints separate from ledger reads, payment writes,
  and reporting endpoints.
- Makes the billing view layer easier to navigate by grouping closely related
  charge-generation flows together.
- Provides a clean home for future charge-generation variants, such as
  selected-month posting or admin-only backfill tools.

Current refactor note:
This module preserves the current behavior from the original monolithic
`apps/billing/views.py` file while moving the code into a focused view module.
"""

from __future__ import annotations

from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from apps.billing.serializers import (
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
)
from apps.billing.services.rent_charge_service import RentChargeService
from apps.billing.views.mixins import OrgScopedAPIView
from apps.leases.models import Lease


class GenerateLeaseRentChargeMonthView(OrgScopedAPIView):
    """
    Generate a rent charge for a lease for a specific year and month.

    This endpoint is explicit rather than assumptive. The caller provides the
    target month, and the billing service decides whether a new charge should
    be created or an existing one should be returned.

    URL params:
        lease_id: Primary key of the target lease.

    Request body:
        {
            "year": 2026,
            "month": 4
        }

    Response:
        {
            "created": true,
            "charge_id": 123,
            "due_date": "2026-04-01"
        }
    """

    def post(self, request, lease_id: int) -> Response:
        """
        Generate a monthly rent charge for the requested lease and month.

        Args:
            request: DRF request object.
            lease_id: Primary key of the target lease.

        Returns:
            Response: Serialized create-or-existing charge payload.
        """
        # Step 1: validate request payload
        serializer = GenerateMonthChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        year = serializer.validated_data["year"]
        month = serializer.validated_data["month"]

        # Step 2: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: enforce org-safe lease lookup
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 4: call billing service
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=lease.id,
            year=year,
            month=month,
        )

        # Step 5: serialize response
        response_serializer = GenerateMonthChargeResponseSerializer(
            instance={
                "created": result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
            }
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class GenerateLeaseRentChargeCurrentMonthView(OrgScopedAPIView):
    """
    Generate the current-month rent charge for a lease.

    This endpoint derives the current year and month on the server side rather
    than requiring the client to provide them.
    """

    def post(self, request, lease_id: int) -> Response:
        """
        Generate a rent charge for the current server month.

        Args:
            request: DRF request object.
            lease_id: Primary key of the target lease.

        Returns:
            Response: Serialized create-or-existing charge payload.
        """
        # Step 1: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 2: enforce org-safe lease lookup
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: derive current server year and month
        today = date.today()
        year = today.year
        month = today.month

        # Step 4: call billing service
        result = RentChargeService.generate_monthly_rent_charge(
            lease_id=lease.id,
            year=year,
            month=month,
        )

        # Step 5: serialize response
        response_serializer = GenerateMonthChargeResponseSerializer(
            instance={
                "created": result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
            }
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)