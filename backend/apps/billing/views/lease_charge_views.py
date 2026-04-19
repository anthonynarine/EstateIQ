"""
Lease-charge views for the billing domain.

This module contains endpoints responsible for lease-scoped charge creation.

Why this file exists:
- Keeps charge-related endpoints separate from ledger reads and payment writes.
- Preserves a thin-view architecture.
- Resolves organization scope in the view and delegates business logic
  to the service layer.

This module intentionally supports two different charge workflows:

1. Monthly rent generation
   - explicit
   - month-anchored
   - idempotent
   - handled by the rent charge service

2. Manual non-rent charge creation
   - explicit
   - one-off
   - lease-scoped
   - handled by the charge write service
"""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.billing.serializers import (
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
    ManualLeaseChargeCreateSerializer,
    ManualLeaseChargeResponseSerializer,
)
from apps.billing.services.charge_write_service import ChargeWriteService
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


class CreateLeaseManualChargeView(OrgScopedAPIView):
    """
    Create a manual non-rent charge for a lease.

    This endpoint is:
    - lease-scoped
    - organization-scoped
    - explicit/manual
    - limited to non-rent charge kinds for this phase

    Supported manual charge kinds:
    - late_fee
    - misc

    Important:
    - This endpoint must not be used for monthly rent posting.
    - Rent remains a dedicated, idempotent workflow.
    """

    def post(self, request, lease_id: int) -> Response:
        """
        Create an explicit manual charge for the requested lease.

        Args:
            request: DRF request object.
            lease_id: Primary key of the target lease.

        Returns:
            Response: Serialized created charge payload.

        Raises:
            serializers.ValidationError: If the input payload is invalid or
                the service layer rejects the request.
        """
        # Step 1: Resolve the active organization boundary.
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 2: Enforce org-safe lease lookup up front for a clean 404 path.
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: Validate the incoming request contract.
        request_serializer = ManualLeaseChargeCreateSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        validated_data = request_serializer.validated_data

        try:
            # Step 4: Delegate write logic to the dedicated manual charge service.
            charge = ChargeWriteService.create_manual_lease_charge(
                organization_id=org.id,
                lease_id=lease.id,
                kind=validated_data["kind"],
                amount=validated_data["amount"],
                due_date=validated_data["due_date"],
                notes=validated_data.get("notes", ""),
                created_by_id=(
                    request.user.id if request.user.is_authenticated else None
                ),
            )
        except DjangoValidationError as exc:
            # Step 5: Normalize Django validation errors into DRF 400 responses.
            detail = (
                getattr(exc, "message_dict", None)
                or getattr(exc, "messages", None)
            )

            if detail:
                raise serializers.ValidationError(detail)

            raise serializers.ValidationError(str(exc))
        except IntegrityError:
            # Step 6: Normalize current DB uniqueness collisions into a stable
            # API-level validation error.
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "A charge with this kind and due date already exists "
                        "for this lease."
                    ]
                }
            )

        # Step 7: Serialize the created charge record.
        response_serializer = ManualLeaseChargeResponseSerializer(instance=charge)

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


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