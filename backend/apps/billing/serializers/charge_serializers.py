"""
Charge-related serializers for the billing domain.

This module contains serializer contracts for charge-oriented billing
operations.

Why this file exists:
- Keeps charge-generation and manual charge-entry contracts separate from
  payment, ledger, and report serializers.
- Preserves a clean serializer boundary for the billing domain.
- Supports both idempotent monthly rent generation and explicit manual
  lease charge creation.

Design principles:
- Rent generation remains a dedicated workflow with its own request contract.
- Manual lease charges are explicit and safe.
- Serializers validate API shape and normalize inputs.
- Business rules that belong to the domain stay in the service layer.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from rest_framework import serializers

from apps.billing.models import Charge, ChargeKind


class GenerateMonthChargeSerializer(serializers.Serializer):
    """
    Validate request payload for generating a monthly rent charge.

    Current stabilized request contract:
        {
            "charge_month": "2026-04-01"
        }

    Why this shape:
    - It matches the frontend's stabilized request direction.
    - It is explicit and month-anchored.
    - It maps cleanly to ledger idempotency using `charge_month`.

    Transitional behavior:
    - The serializer also injects `year` and `month` into
      `validated_data` so the current view/service layer can keep using
      its existing year/month-based API temporarily.
    """

    charge_month = serializers.DateField(
        input_formats=["%Y-%m-%d"],
        format="%Y-%m-%d",
    )

    def validate_charge_month(self, value: date) -> date:
        """
        Validate that the provided charge month is a month anchor.

        Args:
            value: Parsed date value from the request payload.

        Returns:
            date: The validated month-anchor date.

        Raises:
            serializers.ValidationError: If the date is not the first day
                of the month.
        """
        # Step 1: Enforce a first-of-month anchor.
        if value.day != 1:
            raise serializers.ValidationError(
                "charge_month must be the first day of the target month "
                "in YYYY-MM-01 format."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        """
        Normalize serializer output for the existing backend flow.

        This keeps the rest of the pipeline working while we still have a
        rent-charge service that expects separate `year` and `month` inputs.

        Args:
            attrs: Field-level validated serializer attributes.

        Returns:
            dict: Normalized validated data including `charge_month`,
            `year`, and `month`.
        """
        # Step 1: Read the validated month anchor.
        charge_month: date = attrs["charge_month"]

        # Step 2: Expose compatibility fields for the existing service layer.
        attrs["year"] = charge_month.year
        attrs["month"] = charge_month.month

        return attrs


class GenerateMonthChargeResponseSerializer(serializers.Serializer):
    """
    Serialize the response payload for monthly charge generation.

    Note:
    We are keeping the response contract unchanged in this step so we can
    fix the request boundary first and then update the view/service response
    shape safely in the next pass.
    """

    created = serializers.BooleanField()
    already_exists = serializers.BooleanField()
    charge_id = serializers.IntegerField()
    due_date = serializers.DateField()
    charge_month = serializers.DateField()
    message = serializers.CharField()


class ManualLeaseChargeCreateSerializer(serializers.Serializer):
    """
    Validate request payload for explicit manual lease charge creation.

    Supported manual charge kinds for this workflow:
    - late_fee
    - misc

    This serializer intentionally rejects `rent` because monthly rent charges
    must continue to flow through the dedicated rent-generation endpoint.

    Request contract:
        {
            "kind": "late_fee",
            "amount": "75.00",
            "due_date": "2026-04-20",
            "notes": "April late fee"
        }

    Important:
    - This serializer validates API shape and input-level rules.
    - Lease lookup, organization scoping, and persistence belong to the
      view and service layers.
    """

    kind = serializers.ChoiceField(
        choices=[
            (ChargeKind.LATE_FEE, ChargeKind.LATE_FEE),
            (ChargeKind.MISC, ChargeKind.MISC),
        ]
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
    )
    due_date = serializers.DateField(
        input_formats=["%Y-%m-%d"],
        format="%Y-%m-%d",
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )

    def validate_kind(self, value: str) -> str:
        """
        Validate that the manual charge kind is supported by this endpoint.

        Args:
            value: Incoming charge kind.

        Returns:
            str: Validated charge kind.

        Raises:
            serializers.ValidationError: If the kind is not allowed for the
                manual charge workflow.
        """
        # Step 1: Reject rent to preserve the dedicated rent-generation flow.
        if value == ChargeKind.RENT:
            raise serializers.ValidationError(
                "Manual charge creation does not support kind='rent'. "
                "Use the monthly rent generation workflow instead."
            )

        return value

    def validate_amount(self, value: Decimal) -> Decimal:
        """
        Validate that the manual charge amount is positive.

        Args:
            value: Parsed decimal amount.

        Returns:
            Decimal: Validated positive amount.

        Raises:
            serializers.ValidationError: If the amount is zero or negative.
        """
        # Step 1: Enforce positive amounts at the API boundary.
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Charge amount must be greater than 0."
            )

        return value

    def validate_notes(self, value: str) -> str:
        """
        Normalize the notes field.

        Args:
            value: Raw notes string.

        Returns:
            str: Normalized note value.
        """
        # Step 1: Normalize blank-ish notes to an empty string.
        normalized = value.strip()
        return normalized

    def validate(self, attrs: dict) -> dict:
        """
        Perform object-level normalization for manual charge creation.

        Args:
            attrs: Field-level validated serializer attributes.

        Returns:
            dict: Normalized validated data.
        """
        # Step 1: Ensure notes is always present for downstream consistency.
        attrs["notes"] = attrs.get("notes", "").strip()

        return attrs


class ManualLeaseChargeResponseSerializer(serializers.ModelSerializer):
    """
    Serialize the persisted manual lease charge record.

    This response is intentionally narrow and stable so the frontend can:
    - show success state
    - access the new charge identifier
    - refetch the lease ledger as the source of truth
    """

    class Meta:
        """Django REST Framework metadata for manual charge responses."""

        model = Charge
        fields = [
            "id",
            "lease_id",
            "kind",
            "amount",
            "due_date",
            "notes",
            "created_at",
        ]
        read_only_fields = fields