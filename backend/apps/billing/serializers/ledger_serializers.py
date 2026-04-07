# Filename: backend/apps/billing/serializers/ledger_serializers.py

from __future__ import annotations

from rest_framework import serializers


class BillingEntitySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()


class LeaseLedgerContextSerializer(serializers.Serializer):
    lease_id = serializers.IntegerField()
    lease_status = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    rent_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    due_day = serializers.IntegerField(required=False, allow_null=True)
    tenant_names = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    tenant_display = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    building_id = serializers.IntegerField(required=False, allow_null=True)
    unit_id = serializers.IntegerField(required=False, allow_null=True)
    building = BillingEntitySummarySerializer(required=False, allow_null=True)
    unit = BillingEntitySummarySerializer(required=False, allow_null=True)


class LeaseLedgerTotalsSerializer(serializers.Serializer):
    """
    Compatibility serializer.

    Current backend payload may still return:
    - charges
    - payments
    - allocated
    - balance
    - unapplied_payments

    We map those old keys into the newer frontend contract.
    """

    total_charges = serializers.CharField(source="charges")
    total_payments = serializers.CharField(source="payments")
    total_allocated = serializers.CharField(source="allocated")
    outstanding_balance = serializers.CharField(source="balance")
    unapplied_amount = serializers.CharField(source="unapplied_payments")
    overdue_amount = serializers.CharField(
        required=False,
        default="0.00",
    )


class LeaseLedgerChargeRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    lease_id = serializers.IntegerField(required=False)
    kind = serializers.CharField()
    status = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()
    charge_month = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(allow_blank=True)
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        source="balance",
    )
    is_overdue = serializers.BooleanField(required=False)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    updated_at = serializers.DateTimeField(required=False, allow_null=True)


class LeaseLedgerPaymentRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    lease_id = serializers.IntegerField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_at = serializers.DateTimeField()
    method = serializers.CharField()
    external_ref = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    notes = serializers.CharField(allow_blank=True)
    allocated_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    unapplied_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        source="unapplied",
    )
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    updated_at = serializers.DateTimeField(required=False, allow_null=True)


class LeaseLedgerAllocationRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    payment_id = serializers.IntegerField()
    charge_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    updated_at = serializers.DateTimeField(required=False, allow_null=True)


class LeaseLedgerResponseSerializer(serializers.Serializer):
    lease_id = serializers.IntegerField()
    lease = LeaseLedgerContextSerializer(required=False, allow_null=True)
    totals = LeaseLedgerTotalsSerializer()
    charges = LeaseLedgerChargeRowSerializer(many=True)
    payments = LeaseLedgerPaymentRowSerializer(many=True)
    allocations = LeaseLedgerAllocationRowSerializer(
        many=True,
        required=False,
        default=list,
    )