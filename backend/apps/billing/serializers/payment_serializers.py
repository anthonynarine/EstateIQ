# Filename: backend/apps/billing/serializers/payment_serializers.py

"""
Payment-related serializers for the billing domain.

This module contains serializer contracts for recording payments and optional
allocation instructions.

Why this file exists:
- Keeps payment write contracts isolated from charge, ledger, and reporting
  serializers.
- Makes the billing API easier to understand by separating financial receipt
  flows from read-model/reporting flows.
- Creates a clean foundation for later additions like payment detail, void,
  or adjustment serializers.

Current refactor note:
These serializers intentionally preserve the existing contract shape from the
original monolithic `apps/billing/serializers.py` file so we can complete the
structural split before changing endpoint behavior.
"""

from __future__ import annotations

from rest_framework import serializers


class PaymentAllocationItemSerializer(serializers.Serializer):
    """
    Validate one explicit allocation instruction for a payment request.

    Attributes:
        charge_id: Primary key of the charge to allocate against.
        amount: Positive decimal amount to apply to that charge.
    """

    charge_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class CreatePaymentSerializer(serializers.Serializer):
    """
    Validate the request payload for creating a payment.

    This serializer supports two allocation modes:

    - auto:
        The backend applies the payment automatically, typically using FIFO
        logic across open charges.
    - manual:
        The caller supplies explicit allocation rows in `allocations`.

    Attributes:
        lease_id: Lease the payment belongs to.
        amount: Payment amount received.
        paid_at: Timestamp when funds were received.
        method: Optional payment method label.
        external_ref: Optional external reference, such as check number or
            transfer confirmation.
        notes: Optional internal note.
        allocation_mode: Whether allocation is automatic or manual.
        allocations: Optional explicit allocation instructions.
    """

    lease_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_at = serializers.DateTimeField()
    method = serializers.CharField(required=False)
    external_ref = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    allocation_mode = serializers.ChoiceField(
        choices=("auto", "manual"),
        required=False,
        default="auto",
        help_text="auto = FIFO allocation, manual = use allocations[]",
    )
    allocations = PaymentAllocationItemSerializer(many=True, required=False)


class CreatePaymentResponseSerializer(serializers.Serializer):
    """
    Serialize the response payload after payment creation and allocation.

    Attributes:
        payment_id: Primary key of the created payment.
        allocation_mode: Allocation mode used for the request.
        allocated_total: Total amount allocated to charges.
        unapplied_amount: Remaining amount not allocated to any charge.
        allocation_ids: Primary keys of allocations created during the request.
    """

    payment_id = serializers.IntegerField()
    allocation_mode = serializers.CharField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unapplied_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    allocation_ids = serializers.ListField(child=serializers.IntegerField())