"""
URL routes for the billing domain.

This module exposes the public HTTP surface for lease-ledger and billing
operations.

Route groups:
- lease charge generation
- manual lease charge creation
- lease ledger retrieval
- payment creation
- billing reporting
"""

from __future__ import annotations

from django.urls import path

from apps.billing.views import (
    CreateLeaseManualChargeView,
    CreatePaymentView,
    DelinquencyReportView,
    GenerateLeaseRentChargeCurrentMonthView,
    GenerateLeaseRentChargeMonthView,
    LeaseLedgerView,
    OrgDashboardSummaryView,
    RunCurrentMonthRentPostingView,
)

urlpatterns = [
    path(
        "leases/<int:lease_id>/charges/",
        CreateLeaseManualChargeView.as_view(),
        name="billing.create_manual_lease_charge",
    ),
    path(
        "leases/<int:lease_id>/charges/generate-month/",
        GenerateLeaseRentChargeMonthView.as_view(),
        name="billing.generate_month_rent_charge",
    ),
    path(
        "leases/<int:lease_id>/charges/generate-current-month/",
        GenerateLeaseRentChargeCurrentMonthView.as_view(),
        name="billing.generate_current_month_rent_charge",
    ),
    path(
        "leases/<int:lease_id>/ledger/",
        LeaseLedgerView.as_view(),
        name="billing.lease_ledger",
    ),
    path(
        "payments/",
        CreatePaymentView.as_view(),
        name="billing.create_payment",
    ),
    path(
        "reports/delinquency/",
        DelinquencyReportView.as_view(),
        name="billing.report_delinquency",
    ),
    path(
        "reports/dashboard-summary/",
        OrgDashboardSummaryView.as_view(),
        name="billing.report_dashboard_summary",
    ),
    path(
        "reports/rent-posting/run-current-month/",
        RunCurrentMonthRentPostingView.as_view(),
        name="billing.rent_posting_run_current_month",
    ),
]