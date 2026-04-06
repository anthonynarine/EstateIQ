# Filename: backend/apps/demo_data/scenarios/billing.py

from __future__ import annotations


# ✅ New Code

# Step 1: lease-level billing behavior definitions
#
# Behavior meanings:
# - current:
#     Generate monthly rent charges and fully pay them.
# - late_full:
#     Generate monthly rent charges and fully pay them, but the payment date
#     falls after the due date in selected months.
# - partial_current:
#     Older months mostly pay cleanly, but recent months leave an open balance.
# - delinquent:
#     Some months are unpaid or partially paid, leaving meaningful carry balance.
# - historical_closed:
#     Ended lease with full historical payoff by the end of the lease.
# - vacant:
#     No active billing generation needed because the unit is currently vacant.
#
DEMO_BILLING_SCENARIOS = {
    # MAPLE
    "LEASE-MAPLE-1A-2021": {
        "behavior": "historical_closed",
        "payment_method": "ach",
        "late_months": ["2021-09"],
    },
    "LEASE-MAPLE-1A-2022": {
        "behavior": "historical_closed",
        "payment_method": "zelle",
        "late_months": ["2022-11"],
    },
    "LEASE-MAPLE-1A-2023": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },

    "LEASE-MAPLE-1B-2021": {
        "behavior": "historical_closed",
        "payment_method": "check",
        "late_months": ["2022-04"],
    },
    "LEASE-MAPLE-1B-2022": {
        "behavior": "partial_current",
        "payment_method": "zelle",
        "late_months": ["2023-12", "2024-08"],
        "partial_months": {
            "2026-03": "1200.00",
            "2026-04": "900.00",
        },
        "unapplied_payment_months": {
            "2025-06": "150.00",
        },
    },

    "LEASE-MAPLE-1C-2021": {
        "behavior": "historical_closed",
        "payment_method": "cash",
        "late_months": [],
    },
    "LEASE-MAPLE-1C-2022": {
        "behavior": "historical_closed",
        "payment_method": "ach",
        "late_months": ["2023-03"],
    },

    "LEASE-MAPLE-2A-2021": {
        "behavior": "historical_closed",
        "payment_method": "ach",
        "late_months": ["2022-01"],
    },
    "LEASE-MAPLE-2A-2023": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },

    # RIVER
    "LEASE-RIVER-2A-2021": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
        "early_months": ["2025-12"],
    },
    "LEASE-RIVER-2B-2021": {
        "behavior": "historical_closed",
        "payment_method": "check",
        "late_months": ["2021-12", "2022-07"],
    },
    "LEASE-RIVER-2B-2023": {
        "behavior": "delinquent",
        "payment_method": "money_order",
        "late_months": ["2023-05", "2024-02"],
        "partial_months": {
            "2025-11": "1000.00",
            "2026-02": "1300.00",
        },
        "skip_months": [
            "2025-12",
            "2026-01",
            "2026-03",
        ],
    },

    "LEASE-RIVER-3A-2021": {
        "behavior": "historical_closed",
        "payment_method": "cash",
        "late_months": ["2021-10"],
    },
    "LEASE-RIVER-3A-2022": {
        "behavior": "historical_closed",
        "payment_method": "zelle",
        "late_months": ["2023-02"],
    },
    "LEASE-RIVER-3A-2023": {
        "behavior": "late_full",
        "payment_method": "zelle",
        "late_months": ["2024-01", "2025-05", "2026-02"],
    },

    "LEASE-RIVER-3B-2021": {
        "behavior": "historical_closed",
        "payment_method": "cash",
        "late_months": [],
    },
    "LEASE-RIVER-3B-2022": {
        "behavior": "historical_closed",
        "payment_method": "ach",
        "late_months": ["2023-10"],
    },

    # OAK
    "LEASE-OAK-1-2021": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
        "early_months": ["2024-12"],
    },
    "LEASE-OAK-2-2021": {
        "behavior": "late_full",
        "payment_method": "check",
        "late_months": ["2022-06", "2023-11", "2025-01"],
    },
    "LEASE-OAK-3-2021": {
        "behavior": "historical_closed",
        "payment_method": "zelle",
        "late_months": ["2022-09"],
    },
    "LEASE-OAK-3-2023": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },
    "LEASE-OAK-4-2021": {
        "behavior": "historical_closed",
        "payment_method": "cash",
        "late_months": [],
    },
    "LEASE-OAK-4-2023": {
        "behavior": "late_full",
        "payment_method": "zelle",
        "late_months": ["2024-04", "2025-07"],
    },

    # HARBOR
    "LEASE-HARBOR-A-2022": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },
    "LEASE-HARBOR-B-2021": {
        "behavior": "historical_closed",
        "payment_method": "check",
        "late_months": ["2022-05"],
    },
    "LEASE-HARBOR-B-2023": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },
    "LEASE-HARBOR-C-2021": {
        "behavior": "historical_closed",
        "payment_method": "cash",
        "late_months": [],
    },
    "LEASE-HARBOR-C-2022": {
        "behavior": "historical_closed",
        "payment_method": "zelle",
        "late_months": ["2024-03"],
    },
    "LEASE-HARBOR-D-2021": {
        "behavior": "current",
        "payment_method": "ach",
        "late_months": [],
    },
}