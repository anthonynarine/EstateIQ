# Filename: backend/apps/billing/services/__init__.py

"""
Public service exports for the billing domain.

This package contains the billing domain's write workflows and orchestration
services. Services own mutation logic, business-rule enforcement, and
high-level orchestration. Deterministic read/query logic belongs in
`apps.billing.selectors`.

Why this file exists:
- Provides a stable import surface for the billing domain.
- Makes the service package easier to navigate.
- Keeps service responsibilities explicit as the billing app grows.
"""

from apps.billing.services.allocation_service import (
    AllocationRequest,
    AllocationResult,
    AllocationService,
)
from apps.billing.services.delinquency_service import DelinquencyService
from apps.billing.services.lease_ledger_service import LeaseLedgerService
from apps.billing.services.org_dashboard_service import (
    OrgDashboardService,
    OrgDashboardSummary,
)
from apps.billing.services.payment_write_service import (
    CreatePaymentResult,
    PaymentWriteService,
)
from apps.billing.services.rent_charge_service import (
    GenerateMonthResult,
    RentChargeService,
)
from apps.billing.services.rent_posting_service import (
    RentPostingError,
    RentPostingRunResult,
    RentPostingService,
)

__all__ = [
    "AllocationRequest",
    "AllocationResult",
    "AllocationService",
    "CreatePaymentResult",
    "DelinquencyService",
    "GenerateMonthResult",
    "LeaseLedgerService",
    "OrgDashboardService",
    "OrgDashboardSummary",
    "PaymentWriteService",
    "RentChargeService",
    "RentPostingError",
    "RentPostingRunResult",
    "RentPostingService",
]