# Filename: backend/apps/billing/serializers/charge_serializers.py

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

Current refactor note:
These serializers intentionally preserve the existing request/response contract
shape from the original monolithic billing serializer module.
"""

from __future__ import annotations

from rest_framework import serializers


class GenerateMonthChargeSerializer(serializers.Serializer):
    """
    Validate request payload for generating a monthly rent charge.

    Attributes:
        year: Target calendar year for charge generation.
        month: Target calendar month for charge generation.
    """

    year = serializers.IntegerField(min_value=2000, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)


class GenerateMonthChargeResponseSerializer(serializers.Serializer):
    """
    Serialize the response payload for monthly charge generation.

    Attributes:
        created: Whether a new charge was created.
        charge_id: Primary key of the created or reused charge.
        due_date: Due date assigned to the charge.
    """

    created = serializers.BooleanField()
    charge_id = serializers.IntegerField()
    due_date = serializers.DateField()