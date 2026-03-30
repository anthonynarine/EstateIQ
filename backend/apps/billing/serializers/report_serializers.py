# Filename: backend/apps/billing/serializers/report_serializers.py

"""
Reporting serializers for the billing domain.

This module contains serializer contracts for billing-oriented reporting and
summary endpoints.

Why this file exists:
- Keeps reporting contracts separate from charge generation, payment writes,
  and lease-ledger serializers.
- Makes the billing domain easier to read by grouping report/query payloads
  in one place.
- Creates a stable home for delinquency, dashboard, and rent-posting report
  contracts as the domain grows.

Current refactor note:
These serializers intentionally preserve the existing contract shape from the
original monolithic `apps/billing/serializers.py` file so we can complete the
package split before correcting any endpoint/view mismatches.
"""

from __future__ import annotations

from rest_framework import serializers


class DelinquencyQuerySerializer(serializers.Serializer):
    """
    Validate query parameters for the delinquency report endpoint.

    Attributes:
        as_of: Optional report date used to compute aging and delinquency.
            If omitted, the server may default to today's date.
    """

    as_of = serializers.DateField(required=False)


class AgingBucketsSerializer(serializers.Serializer):
    """
    Serialize aging-bucket totals for one lease.

    Attributes:
        current_0_30: Outstanding amount aged 0 to 30 days.
        days_31_60: Outstanding amount aged 31 to 60 days.
        days_61_90: Outstanding amount aged 61 to 90 days.
        days_90_plus: Outstanding amount aged more than 90 days.
    """

    current_0_30 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_31_60 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_61_90 = serializers.DecimalField(max_digits=12, decimal_places=2)
    days_90_plus = serializers.DecimalField(max_digits=12, decimal_places=2)


class DelinquencyLeaseRowSerializer(serializers.Serializer):
    """
    Serialize one lease row in the delinquency report.

    Attributes:
        lease_id: Primary key of the lease.
        total_outstanding: Total unpaid amount for the lease as of the report date.
        oldest_due_date: Oldest unpaid charge due date, if any.
        buckets: Aging-bucket totals for the lease.
    """

    lease_id = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    oldest_due_date = serializers.DateField(allow_null=True)
    buckets = AgingBucketsSerializer()


class DelinquencyReportResponseSerializer(serializers.Serializer):
    """
    Serialize the full delinquency report response.

    Attributes:
        as_of: Report date used for delinquency calculations.
        results: Lease-level delinquency rows.
    """

    as_of = serializers.DateField()
    results = DelinquencyLeaseRowSerializer(many=True)


class OrgDashboardQuerySerializer(serializers.Serializer):
    """
    Validate query parameters for the org dashboard summary endpoint.

    Attributes:
        as_of: Optional report date used to compute summary metrics.
    """

    as_of = serializers.DateField(required=False)


class OrgDashboardSummarySerializer(serializers.Serializer):
    """
    Serialize the organization-level billing dashboard summary.

    Attributes:
        as_of: Report date used for the summary.
        expected_rent_this_month: Rent expected for the current month.
        collected_this_month: Payments collected during the current month.
        outstanding_as_of: Total outstanding balance as of the report date.
        delinquent_leases_count: Count of delinquent leases.
        unapplied_credits_total: Total payment amount not yet allocated.
    """

    as_of = serializers.DateField()
    expected_rent_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    collected_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_as_of = serializers.DecimalField(max_digits=12, decimal_places=2)
    delinquent_leases_count = serializers.IntegerField()
    unapplied_credits_total = serializers.DecimalField(max_digits=12, decimal_places=2)


class RentPostingRunQuerySerializer(serializers.Serializer):
    """
    Validate query parameters for the current-month rent posting run endpoint.

    Attributes:
        as_of: Optional date that controls which month is treated as current.
    """

    as_of = serializers.DateField(required=False)


class RentPostingErrorSerializer(serializers.Serializer):
    """
    Serialize one error row from a rent posting run.

    Attributes:
        lease_id: Primary key of the lease that failed processing.
        error: Human-readable error message.
    """

    lease_id = serializers.IntegerField()
    error = serializers.CharField()


class RentPostingRunResponseSerializer(serializers.Serializer):
    """
    Serialize the response for a current-month rent posting run.

    Attributes:
        as_of: Date used to determine the current posting month.
        leases_processed: Number of leases evaluated.
        charges_created: Number of charges newly created.
        charges_existing: Number of charges already present.
        created_charge_ids: IDs of newly created charges.
        errors: Lease-level errors encountered during the run.
    """

    as_of = serializers.DateField()
    leases_processed = serializers.IntegerField()
    charges_created = serializers.IntegerField()
    charges_existing = serializers.IntegerField()
    created_charge_ids = serializers.ListField(child=serializers.IntegerField())
    errors = RentPostingErrorSerializer(many=True)