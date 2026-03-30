# Filename: backend/apps/billing/serializers/__init__.py

"""
Public serializer exports for the billing domain.

This package exposes the canonical serializer surface used by billing views and
other callers throughout the application.

Why this file exists:
- Keeps imports stable after splitting the old monolithic `serializers.py`.
- Allows callers to continue using:
    from apps.billing.serializers import SomeSerializer
- Centralizes the billing domain's public serializer API in one place.

Current refactor note:
These exports preserve the existing serializer import surface while the billing
domain is being split into focused modules.
"""

from __future__ import annotations

from apps.billing.serializers.charge_serializers import (
    GenerateMonthChargeResponseSerializer,
    GenerateMonthChargeSerializer,
)
from apps.billing.serializers.ledger_serializers import (
    LeaseLedgerChargeRowSerializer,
    LeaseLedgerPaymentRowSerializer,
    LeaseLedgerResponseSerializer,
    LeaseLedgerTotalsSerializer,
)
from apps.billing.serializers.payment_serializers import (
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
    PaymentAllocationItemSerializer,
)
from apps.billing.serializers.report_serializers import (
    AgingBucketsSerializer,
    DelinquencyLeaseRowSerializer,
    DelinquencyQuerySerializer,
    DelinquencyReportResponseSerializer,
    OrgDashboardQuerySerializer,
    OrgDashboardSummarySerializer,
    RentPostingErrorSerializer,
    RentPostingRunQuerySerializer,
    RentPostingRunResponseSerializer,
)

__all__ = [
    "AgingBucketsSerializer",
    "CreatePaymentResponseSerializer",
    "CreatePaymentSerializer",
    "DelinquencyLeaseRowSerializer",
    "DelinquencyQuerySerializer",
    "DelinquencyReportResponseSerializer",
    "GenerateMonthChargeResponseSerializer",
    "GenerateMonthChargeSerializer",
    "LeaseLedgerChargeRowSerializer",
    "LeaseLedgerPaymentRowSerializer",
    "LeaseLedgerResponseSerializer",
    "LeaseLedgerTotalsSerializer",
    "OrgDashboardQuerySerializer",
    "OrgDashboardSummarySerializer",
    "PaymentAllocationItemSerializer",
    "RentPostingErrorSerializer",
    "RentPostingRunQuerySerializer",
    "RentPostingRunResponseSerializer",
]