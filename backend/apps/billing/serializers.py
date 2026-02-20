# Filename: apps/billing/serializers.py

"""
Billing serializers.

We keep serializers minimal and delegate business logic to services.
"""

from __future__ import annotations

from rest_framework import serializers


class GenerateMonthChargeSerializer(serializers.Serializer):
    """Validate request payload for generating a monthly rent charge."""
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)

class GenerateMonthChargeResponseSerializer(serializers.Serializer):
    """Shape the response for monthly charge generation."""
    created = serializers.BooleanField()
    charge_id = serializers.IntegerField()
    due_date = serializers.DateField()

class LeaseLedgerTotalsSerializer(serializers.Serializer):
    charges = serializers.CharField()
    payments = serializers.CharField()
    allocated = serializers.CharField()
    balance = serializers.CharField()
    unapplied_payments = serializers.CharField()

class LeaseLedgerChargeRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(allow_blank=True)

class LeaseLedgerPaymentRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_at = serializers.DateTimeField()
    method = serializers.CharField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unapplied = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(allow_blank=True)

class LeaseLedgerResponseSerializer(serializers.Serializer):
    lease_id = serializers.IntegerField()
    totals = LeaseLedgerTotalsSerializer()
    charges = LeaseLedgerChargeRowSerializer(many=True)
    payments = LeaseLedgerPaymentRowSerializer(many=True)

class DelinquencyQuerySerializer(serializers.Serializer):
    """Validate delinquency query params."""
    as_of = serializers.DateField(required=False)

class AgingBucketsSerializer(serializers.Serializer):
    current_0_30 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_31_60 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_61_90 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_90_plus = serializers.DecimalField(max_digits=12, decimal_places=2)

class DelinquencyLeaseRowSerializer(serializers.Serializer):
    lease_id = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    oldest_due_date = serializers.DateField(allow_null=True)
    buckets = AgingBucketsSerializer()

class DelinquencyReportResponseSerializer(serializers.Serializer):
    as_of = serializers.DateField()
    results = DelinquencyLeaseRowSerializer(many=True)

class OrgDashboardQuerySerializer(serializers.Serializer):
    as_of = serializers.DateField(required=False)

class OrgDashboardSummarySerializer(serializers.Serializer):
    as_of = serializers.DateField()
    expected_rent_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    collected_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_as_of = serializers.DecimalField(max_digits=12, decimal_places=2)
    delinquent_leases_count = serializers.IntegerField()
    unapplied_credits_total = serializers.DecimalField(max_digits=12, decimal_places=2)

class PaymentAllocationItemSerializer(serializers.Serializer):
    charge_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

class CreatePaymentSerializer(serializers.Serializer):
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
    payment_id = serializers.IntegerField()
    allocation_mode = serializers.CharField()
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unapplied_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    allocation_ids = serializers.ListField(child=serializers.IntegerField())

class RentPostingRunQuerySerializer(serializers.Serializer):
    as_of = serializers.DateField(required=False)

class RentPostingErrorSerializer(serializers.Serializer):
    lease_id = serializers.IntegerField()
    error = serializers.CharField()

class RentPostingRunResponseSerializer(serializers.Serializer):
    as_of = serializers.DateField()
    leases_processed = serializers.IntegerField()
    charges_created = serializers.IntegerField()
    charges_existing = serializers.IntegerField()
    created_charge_ids = serializers.ListField(child=serializers.IntegerField())
    errors = RentPostingErrorSerializer(many=True)
