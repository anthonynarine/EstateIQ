# Filename: backend/apps/billing/views/__init__.py

"""
Public view exports for the billing domain.

This package exposes the canonical billing view surface used by the billing
URL configuration and preserves a small amount of backwards compatibility for
older imports and test patch paths.

Why this file exists:
- Keeps imports stable after splitting the old monolithic `views.py`.
- Allows callers to continue using:
    from apps.billing.views import SomeBillingView
- Preserves compatibility for legacy patch targets such as:
    apps.billing.views.date

Backwards-compatibility note:
Historically, `apps.billing.views` was a single module that imported `date`
directly. Some tests still patch that path. We re-export `date` here so those
tests can continue to work while the refactor settles.
"""

from __future__ import annotations

from datetime import date

from apps.billing.views.lease_charge_views import (
    GenerateLeaseRentChargeCurrentMonthView,
    GenerateLeaseRentChargeMonthView,
)
from apps.billing.views.ledger_views import LeaseLedgerView
from apps.billing.views.payment_views import CreatePaymentView
from apps.billing.views.report_views import (
    DelinquencyReportView,
    OrgDashboardSummaryView,
    RunCurrentMonthRentPostingView,
)

__all__ = [
    "CreatePaymentView",
    "DelinquencyReportView",
    "GenerateLeaseRentChargeCurrentMonthView",
    "GenerateLeaseRentChargeMonthView",
    "LeaseLedgerView",
    "OrgDashboardSummaryView",
    "RunCurrentMonthRentPostingView",
    "date",
]