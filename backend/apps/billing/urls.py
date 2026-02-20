# Filename: apps/billing/urls.py

from django.urls import path

from apps.billing.views import GenerateLeaseRentChargeMonthView, LeaseLedgerView, DelinquencyReportView, OrgDashboardSummaryView, CreatePaymentView, GenerateLeaseRentChargeCurrentMonthView, RunCurrentMonthRentPostingView

urlpatterns = [
    path(
        "leases/<int:lease_id>/charges/generate-month/",
        GenerateLeaseRentChargeMonthView.as_view(),
        name="billing.generate_month_rent_charge",
    ),
    path(
        "leases/<int:lease_id>/ledger/",
        LeaseLedgerView.as_view(),
        name="billing.lease_ledger",
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
     path("payments/", CreatePaymentView.as_view(), name="billing.create_payment"
    ),
    path(
        "leases/<int:lease_id>/charges/generate-current-month/",
        GenerateLeaseRentChargeCurrentMonthView.as_view(),
        name="billing.generate_current_month_rent_charge",
    ),
    path(
        "reports/rent-posting/run-current-month/",
        RunCurrentMonthRentPostingView.as_view(),
        name="billing.rent_posting_run_current_month",
    ),
]
