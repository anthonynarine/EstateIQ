# Filename: backend/apps/billing/views/payment_views.py

"""
Payment-write views for the billing domain.

This module contains endpoints responsible for recording lease-scoped
payments and optional allocation instructions.

Why this file exists:
- Keeps payment-write endpoints separate from lease-ledger reads,
  charge-generation endpoints, and reporting endpoints.
- Gives the billing domain a focused place for payment request handling.
- Preserves the thin-view pattern: validate input, enforce org boundary,
  delegate to the service layer, and serialize the response.

Architectural note:
The payment write contract is now owned by
`apps.billing.services.payment_write_service.PaymentWriteService`.
This view should not translate between legacy service signatures and the
public API contract. The serializer/view contract is the canonical input
shape for payment recording.
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.billing.serializers import (
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
)
from apps.billing.services.payment_write_service import PaymentWriteService
from apps.billing.views.mixins import OrgScopedAPIView
from apps.leases.models import Lease


class CreatePaymentView(OrgScopedAPIView):
    """
    Create a payment and optionally allocate it to one or more charges.

    Request contract:
        - lease_id
        - amount
        - paid_at
        - method
        - external_ref (optional)
        - notes (optional)
        - allocation_mode ("auto" or "manual")
        - allocations (required in manual mode)

    Response contract:
        - payment_id
        - allocation_mode
        - allocated_total
        - unapplied_amount
        - allocation_ids
    """

    def post(self, request) -> Response:
        """
        Record a payment for a lease and optionally allocate it.

        Args:
            request: DRF request object.

        Returns:
            Response: Serialized payment creation payload.

        Raises:
            ValidationError: If manual allocation mode is selected without
                allocation rows.
        """
        # Step 1: validate request payload
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # Step 2: enforce organization boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: enforce organization-safe lease lookup
        lease = get_object_or_404(
            Lease.objects.only("id", "organization_id"),
            id=validated_data["lease_id"],
            organization=org,
        )

        # Step 4: enforce the manual-allocation contract explicitly
        allocation_mode = validated_data.get("allocation_mode", "auto")
        allocations_payload = validated_data.get("allocations") or []
        if allocation_mode == "manual" and not allocations_payload:
            raise ValidationError(
                {
                    "allocations": (
                        "Manual allocation mode requires at least one allocation row."
                    )
                }
            )

        # Step 5: delegate the payment write workflow to the service layer
        result = PaymentWriteService.record_payment(
            organization_id=org.id,
            lease_id=lease.id,
            amount=validated_data["amount"],
            paid_at=validated_data["paid_at"],
            method=validated_data["method"],
            external_ref=validated_data.get("external_ref"),
            notes=validated_data.get("notes"),
            allocation_mode=allocation_mode,
            allocations=allocations_payload,
            created_by_id=getattr(request.user, "id", None),
        )

        # Step 6: serialize the stable response contract
        response_serializer = CreatePaymentResponseSerializer(
            instance={
                "payment_id": result.payment_id,
                "allocation_mode": allocation_mode,
                "allocated_total": result.allocated_total,
                "unapplied_amount": result.unapplied_amount,
                "allocation_ids": result.allocation_ids,
            }
        )

        # Step 7: return the created response
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)