"""
Charge-related serializers for the billing domain.

This module contains serializer contracts related to charge generation request
and response payloads.

Why this file exists:
- Keeps charge-generation contracts separate from payment, ledger, and report
  serializers.
- Makes the billing serializer layer easier to read and maintain.
- Supports the lease-charge endpoints without forcing unrelated serializers
  into one monolithic file.
"""

from __future__ import annotations

from datetime import date

from rest_framework import serializers


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
        # Step 1: enforce a first-of-month anchor
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
        # Step 1: read the validated month anchor
        charge_month: date = attrs["charge_month"]

        # Step 2: expose compatibility fields for the existing service layer
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