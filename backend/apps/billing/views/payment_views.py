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
  delegate to the service layer, serialize response.

Refactor note:
The legacy monolithic payment view drifted away from the serializer contract.
This module corrects that mismatch by accepting the current payment serializer
shape while still providing a small compatibility layer for the existing
service method signature during the refactor.
"""

from __future__ import annotations

import inspect
from decimal import Decimal
from typing import Any

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.billing.serializers import (
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
)
from apps.billing.services.lease_ledger_service import LeaseLedgerService
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

    @staticmethod
    def _build_service_kwargs(
        *,
        organization_id: int,
        lease_id: int,
        validated_data: dict[str, Any],
        user_id: int | None,
    ) -> dict[str, Any]:
        """
        Build a service-call payload compatible with the current service signature.

        This method supports a transitional refactor state where the serializer
        contract already uses:
            - paid_at
            - external_ref
            - notes

        while the service may still expect older names such as:
            - payment_date
            - reference
            - memo

        Args:
            organization_id: Active organization primary key.
            lease_id: Target lease primary key.
            validated_data: Validated serializer payload.
            user_id: Authenticated user ID, if available.

        Returns:
            dict[str, Any]: Keyword args filtered to the service signature.
        """
        # Step 1: inspect the current service method signature
        service_signature = inspect.signature(
            LeaseLedgerService.create_payment_and_allocate
        )

        # Step 2: define canonical input values from the serializer contract
        allocation_mode = validated_data.get("allocation_mode", "auto")
        allocations_payload = validated_data.get("allocations") or []

        candidate_kwargs = {
            "organization_id": organization_id,
            "lease_id": lease_id,
            "amount": validated_data["amount"],
            "paid_at": validated_data["paid_at"],
            "payment_date": validated_data["paid_at"],
            "method": validated_data.get("method"),
            "external_ref": validated_data.get("external_ref"),
            "reference": validated_data.get("external_ref"),
            "notes": validated_data.get("notes"),
            "memo": validated_data.get("notes"),
            "allocation_mode": allocation_mode,
            "allocations_payload": allocations_payload,
            "created_by_id": user_id,
            "user_id": user_id,
        }

        # Step 3: keep only the kwargs supported by the actual service signature
        return {
            key: value
            for key, value in candidate_kwargs.items()
            if key in service_signature.parameters and value is not None
        }

    @staticmethod
    def _build_response_payload(
        *,
        result: Any,
        allocation_mode: str,
    ) -> dict[str, Any]:
        """
        Normalize the service result into the public payment response contract.

        Args:
            result: Service-layer result object.
            allocation_mode: Allocation mode used for the request.

        Returns:
            dict[str, Any]: Payload matching CreatePaymentResponseSerializer.
        """
        # Step 1: prefer the new result fields when available
        payment_id = getattr(result, "payment_id", None)
        allocated_total = getattr(result, "allocated_total", Decimal("0.00"))
        unapplied_amount = getattr(result, "unapplied_amount", Decimal("0.00"))
        allocation_ids = getattr(result, "allocation_ids", None)

        # Step 2: tolerate older transitional result shapes
        if allocation_ids is None:
            legacy_allocations = getattr(result, "allocations_created", None)
            if isinstance(legacy_allocations, list):
                allocation_ids = legacy_allocations
            else:
                allocation_ids = []

        # Step 3: return the stable serializer contract
        return {
            "payment_id": payment_id,
            "allocation_mode": allocation_mode,
            "allocated_total": allocated_total,
            "unapplied_amount": unapplied_amount,
            "allocation_ids": allocation_ids,
        }

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

        # Step 2: enforce org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 3: enforce org-safe lease lookup
        lease = get_object_or_404(
            Lease,
            id=validated_data["lease_id"],
            organization=org,
        )

        # Step 4: enforce manual-allocation contract explicitly
        allocation_mode = validated_data.get("allocation_mode", "auto")
        allocations_payload = validated_data.get("allocations") or []
        if allocation_mode == "manual" and not allocations_payload:
            raise ValidationError(
                {"allocations": "Manual allocation mode requires at least one allocation row."}
            )

        # Step 5: adapt serializer data to the current service signature
        user_id = getattr(request.user, "id", None)
        service_kwargs = self._build_service_kwargs(
            organization_id=org.id,
            lease_id=lease.id,
            validated_data=validated_data,
            user_id=user_id,
        )

        # Step 6: delegate payment creation/allocation to the service layer
        result = LeaseLedgerService.create_payment_and_allocate(**service_kwargs)

        # Step 7: normalize the service result into the public API response shape
        response_payload = self._build_response_payload(
            result=result,
            allocation_mode=allocation_mode,
        )
        response_serializer = CreatePaymentResponseSerializer(
            instance=response_payload
        )

        # Step 8: return created response
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)