"""
Lease-charge views for the billing domain.

This module contains endpoints responsible for generating manual monthly
rent charges for a single lease.

Why this file exists:
- Keeps charge-generation endpoints separate from ledger reads and payment writes.
- Preserves a thin-view architecture.
- Resolves organization scope in the view and delegates rent-generation logic
  to the service layer.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.billing.serializers import (
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
)
from apps.billing.services.rent_charge_service import RentChargeService
from apps.billing.views.mixins import OrgScopedAPIView
from apps.leases.models import Lease


class LeaseGenerateMonthChargeView(OrgScopedAPIView):
    """
    Generate a monthly rent charge for a lease.

    This endpoint is:
    - lease-scoped
    - organization-scoped
    - explicit/manual rather than automatic

    The view does not own billing business rules.
    It only:
    - resolves org scope
    - validates request shape
    - calls the service layer
    - serializes the stable response
    """

    def post(self, request, lease_id: int) -> Response:
        """
        Generate the rent charge for the requested lease and month.

        Args:
            request: DRF request object.
            lease_id: Primary key of the target lease.

        Returns:
            Response: Serialized monthly charge generation result.
        """
        # Step 1: Resolve org boundary.
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 2: Enforce org-safe lease lookup.
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: Validate and normalize the incoming request payload.
        request_serializer = GenerateMonthChargeSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        validated_data = request_serializer.validated_data

        try:
            # Step 4: Delegate charge generation to the service layer.
            result = RentChargeService.generate_monthly_rent_charge(
                lease_id=lease.id,
                year=validated_data["year"],
                month=validated_data["month"],
                created_by_id=(
                    request.user.id if request.user.is_authenticated else None
                ),
            )
        except DjangoValidationError as exc:
            # Step 5: Normalize Django validation errors into DRF-friendly 400s.
            detail = (
                getattr(exc, "message_dict", None)
                or getattr(exc, "messages", None)
            )

            if detail:
                raise serializers.ValidationError(detail)

            raise serializers.ValidationError(str(exc))

        # Step 6: Serialize the richer response contract for the frontend.
        response_serializer = GenerateMonthChargeResponseSerializer(
            instance={
                "created": result.created,
                "already_exists": not result.created,
                "charge_id": result.charge_id,
                "due_date": result.due_date,
                "charge_month": validated_data["charge_month"],
                "message": (
                    "Monthly rent charge generated successfully."
                    if result.created
                    else "Monthly rent charge already exists for that month."
                ),
            }
        )

        return Response(response_serializer.data, status=status.HTTP_200_OK)


class GenerateLeaseRentChargeMonthView(LeaseGenerateMonthChargeView):
    """
    Backward-compatible alias for legacy monthly rent charge imports.
    """

    pass


class GenerateLeaseRentChargeCurrentMonthView(LeaseGenerateMonthChargeView):
    """
    Backward-compatible alias for legacy current-month rent charge imports.

    Note:
    This temporarily points to the same base view so existing imports stop
    failing while the billing refactor settles.
    """

    pass