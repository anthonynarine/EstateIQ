# Filename: backend/apps/billing/serializers/ledger_serializers.py

"""
Lease-ledger serializers for the billing domain.

This module contains read-model serializers for the lease ledger API.

Why this file exists:
- Keeps lease-ledger response contracts separate from payment writes,
  charge-generation requests, and reporting serializers.
- Makes the billing API easier to reason about by isolating the
  lease-specific financial read model.
- Creates a clean foundation for later ledger enrichment, such as
  allocations, lease summary metadata, and richer status indicators.

Current refactor note:
These serializers intentionally preserve the existing contract shape from the
original monolithic `apps/billing/serializers.py` file so we can finish the
structural split before enhancing the ledger payload.
"""

from __future__ import annotations

from rest_framework import serializers


class LeaseLedgerTotalsSerializer(serializers.Serializer):
    """
    Serialize aggregate totals for a lease ledger.

    Attributes:
        charges: Sum of all posted charges on the lease.
        payments: Sum of all recorded payments on the lease.
        allocated: Sum of all allocations applied to charges.
        balance: Remaining outstanding balance on the lease.
        unapplied_payments: Payment amount not yet allocated to charges.
    """

    charges = serializers.CharField()
    payments = serializers.CharField()
    allocated = serializers.CharField()
    balance = serializers.CharField()
    unapplied_payments = serializers.CharField()


class LeaseLedgerChargeRowSerializer(serializers.Serializer):
    """
    Serialize one charge row in the lease ledger.

    Attributes:
        id: Primary key of the charge.
        kind: Charge category such as rent or late fee.
        amount: Original charge amount.
        due_date: Due date of the charge.
        allocated_total: Total amount allocated toward the charge.
        balance: Remaining unpaid balance for the charge.
        notes: Optional internal note.
    """

    id = serializers.IntegerField()
    kind = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(allow_blank=True)


class LeaseLedgerPaymentRowSerializer(serializers.Serializer):
    """
    Serialize one payment row in the lease ledger.

    Attributes:
        id: Primary key of the payment.
        amount: Original payment amount.
        paid_at: Timestamp when the payment was received.
        method: Payment receipt method.
        allocated_total: Total amount allocated from the payment.
        unapplied: Remaining amount not yet allocated.
        notes: Optional internal note.
    """

    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_at = serializers.DateTimeField()
    method = serializers.CharField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unapplied = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(allow_blank=True)


class LeaseLedgerResponseSerializer(serializers.Serializer):
    """
    Serialize the full lease ledger response payload.

    Attributes:
        lease_id: Primary key of the lease.
        totals: Aggregate financial totals for the lease.
        charges: Charge rows included in the ledger.
        payments: Payment rows included in the ledger.
    """

    lease_id = serializers.IntegerField()
    totals = LeaseLedgerTotalsSerializer()
    charges = LeaseLedgerChargeRowSerializer(many=True)
    payments = LeaseLedgerPaymentRowSerializer(many=True)