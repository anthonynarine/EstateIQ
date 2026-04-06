from __future__ import annotations

from apps.demo_data.scenarios.billing import DEMO_BILLING_SCENARIOS
from apps.demo_data.scenarios.buildings import DEMO_BUILDING_SCENARIOS
from apps.demo_data.scenarios.leases import DEMO_LEASE_SCENARIOS
from apps.demo_data.scenarios.tenants import DEMO_TENANT_SCENARIOS
from apps.demo_data.scenarios.expenses import (
    DEMO_EXPENSE_SCENARIOS,
    DEMO_VENDOR_SCENARIOS,
)

__all__ = [
    "DEMO_BUILDING_SCENARIOS",
    "DEMO_TENANT_SCENARIOS",
    "DEMO_LEASE_SCENARIOS",
    "DEMO_BILLING_SCENARIOS",
    "DEMO_EXPENSE_SCENARIOS",
    "DEMO_VENDOR_SCENARIOS",
]