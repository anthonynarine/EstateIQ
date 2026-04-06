# Filename: backend/apps/demo_data/scenarios/expenses.py

"""Deterministic expense scenario data for the demo portfolio seed system.

This module defines the full historical expense story for the demo organization.
The data here should stay:

- deterministic
- rerunnable
- easy to understand
- scenario-driven rather than builder-driven

Mental model:
    scenarios/expenses.py
        -> defines the "what"
    builders/expense_builder.py
        -> handles the "how"

Nothing in this file should perform database work.
Nothing in this file should use random data generation.
"""

from __future__ import annotations

from decimal import Decimal


# Step 1: Define reusable category scenarios.
DEMO_EXPENSE_CATEGORY_SCENARIOS = [
    {
        "slug": "software",
        "name": "Software",
        "description": "Portfolio software and operating subscriptions.",
    },
    {
        "slug": "bookkeeping",
        "name": "Bookkeeping",
        "description": "Bookkeeping and monthly finance support.",
    },
    {
        "slug": "tax-prep",
        "name": "Tax Prep",
        "description": "CPA and tax preparation services.",
    },
    {
        "slug": "insurance",
        "name": "Insurance",
        "description": "Umbrella and property insurance costs.",
    },
    {
        "slug": "utilities",
        "name": "Utilities",
        "description": "Water, sewer, common electric, and related utilities.",
    },
    {
        "slug": "landscaping",
        "name": "Landscaping",
        "description": "Lawn care and seasonal grounds maintenance.",
    },
    {
        "slug": "snow-removal",
        "name": "Snow Removal",
        "description": "Winter storm and snow clearance services.",
    },
    {
        "slug": "cleaning",
        "name": "Cleaning",
        "description": "Common-area, turnover, and prep cleaning.",
    },
    {
        "slug": "pest-control",
        "name": "Pest Control",
        "description": "Routine and event-driven pest control services.",
    },
    {
        "slug": "repairs",
        "name": "Repairs",
        "description": "General repair and maintenance work.",
    },
    {
        "slug": "painting",
        "name": "Painting",
        "description": "Interior repainting and touch-up work.",
    },
    {
        "slug": "appliances",
        "name": "Appliances",
        "description": "Appliance replacement or repair events.",
    },
    {
        "slug": "locks-security",
        "name": "Locks & Security",
        "description": "Lock change and entry hardware work.",
    },
]


# Step 2: Define reusable vendor scenarios.
DEMO_VENDOR_SCENARIOS = [
    {
        "slug": "propel-software",
        "name": "Propel Software Co",
        "email": "billing@propelsoftware.example",
        "phone": "201-555-0101",
    },
    {
        "slug": "north-hudson-books",
        "name": "North Hudson Bookkeeping",
        "email": "support@nhbooks.example",
        "phone": "201-555-0102",
    },
    {
        "slug": "santos-cpa",
        "name": "Santos CPA Group",
        "email": "office@santoscpa.example",
        "phone": "201-555-0103",
    },
    {
        "slug": "atlas-insurance",
        "name": "Atlas Landlord Insurance",
        "email": "service@atlasinsurance.example",
        "phone": "201-555-0104",
    },
    {
        "slug": "garden-state-water",
        "name": "Garden State Water Utility",
        "email": "billing@gswater.example",
        "phone": "201-555-0105",
    },
    {
        "slug": "true-north-landscaping",
        "name": "True North Landscaping",
        "email": "dispatch@tnlandscaping.example",
        "phone": "201-555-0106",
    },
    {
        "slug": "ice-away-services",
        "name": "Ice Away Services",
        "email": "ops@iceaway.example",
        "phone": "201-555-0107",
    },
    {
        "slug": "river-city-cleaning",
        "name": "River City Cleaning",
        "email": "service@rivercitycleaning.example",
        "phone": "201-555-0108",
    },
    {
        "slug": "urban-pest",
        "name": "Urban Pest Control",
        "email": "service@urbanpest.example",
        "phone": "201-555-0109",
    },
    {
        "slug": "summit-repair",
        "name": "Summit Repair Services",
        "email": "dispatch@summitrepair.example",
        "phone": "201-555-0110",
    },
    {
        "slug": "fresh-coat-painting",
        "name": "Fresh Coat Painting",
        "email": "hello@freshcoat.example",
        "phone": "201-555-0111",
    },
    {
        "slug": "metro-appliance",
        "name": "Metro Appliance Supply",
        "email": "orders@metroappliance.example",
        "phone": "201-555-0112",
    },
    {
        "slug": "secure-entry-locksmith",
        "name": "Secure Entry Locksmith",
        "email": "service@secureentry.example",
        "phone": "201-555-0113",
    },
]


# Step 3: Define deterministic expense scenarios by scope.
DEMO_EXPENSE_SCENARIOS = {
    "organization_recurring": [
        {
            "code": "org-software-monthly",
            "scope": "organization",
            "title": "Portfolio operations software subscription",
            "category_slug": "software",
            "vendor_slug": "propel-software",
            "amount": Decimal("79.00"),
            "start_date": "2024-01-05",
            "end_date": "2026-03-05",
            "frequency": "monthly",
            "notes_template": "Monthly software subscription for portfolio operations.",
        },
        {
            "code": "org-bookkeeping-quarterly",
            "scope": "organization",
            "title": "Quarterly bookkeeping review",
            "category_slug": "bookkeeping",
            "vendor_slug": "north-hudson-books",
            "amount": Decimal("325.00"),
            "start_date": "2024-03-15",
            "end_date": "2026-03-15",
            "frequency": "quarterly",
            "notes_template": "Quarterly bookkeeping reconciliation and reporting support.",
        },
        {
            "code": "org-tax-prep-annual",
            "scope": "organization",
            "title": "Annual tax preparation",
            "category_slug": "tax-prep",
            "vendor_slug": "santos-cpa",
            "amount": Decimal("950.00"),
            "start_date": "2024-02-20",
            "end_date": "2026-02-20",
            "frequency": "annual",
            "notes_template": "Annual tax preparation and filing support.",
        },
        {
            "code": "org-umbrella-insurance-annual",
            "scope": "organization",
            "title": "Annual umbrella insurance premium",
            "category_slug": "insurance",
            "vendor_slug": "atlas-insurance",
            "amount": Decimal("1200.00"),
            "start_date": "2024-01-12",
            "end_date": "2026-01-12",
            "frequency": "annual",
            "notes_template": "Umbrella liability policy premium for the portfolio.",
        },
    ],
    "building_recurring": [
        {
            "code": "maple-water-monthly",
            "scope": "building",
            "building_code": "MAPLE",
            "title": "Maple Court water and sewer",
            "category_slug": "utilities",
            "vendor_slug": "garden-state-water",
            "amount": Decimal("245.00"),
            "start_date": "2024-01-08",
            "end_date": "2026-03-08",
            "frequency": "monthly",
            "notes_template": "Monthly water and sewer service for Maple Court.",
        },
        {
            "code": "maple-snow-seasonal",
            "scope": "building",
            "building_code": "MAPLE",
            "title": "Maple Court snow removal",
            "category_slug": "snow-removal",
            "vendor_slug": "ice-away-services",
            "amount": Decimal("180.00"),
            "dates": [
                "2024-01-19",
                "2024-02-17",
                "2024-12-15",
                "2025-01-11",
                "2025-02-08",
                "2025-12-14",
                "2026-01-10",
                "2026-02-14",
            ],
            "notes_template": "Seasonal snow and ice removal after storm event.",
        },
        {
            "code": "river-insurance-monthly",
            "scope": "building",
            "building_code": "RIVER",
            "title": "River Bend building insurance",
            "category_slug": "insurance",
            "vendor_slug": "atlas-insurance",
            "amount": Decimal("310.00"),
            "start_date": "2024-01-09",
            "end_date": "2026-03-09",
            "frequency": "monthly",
            "notes_template": "Monthly allocated insurance cost for River Bend.",
        },
        {
            "code": "river-pest-bimonthly",
            "scope": "building",
            "building_code": "RIVER",
            "title": "River Bend pest control service",
            "category_slug": "pest-control",
            "vendor_slug": "urban-pest",
            "amount": Decimal("95.00"),
            "start_date": "2024-02-14",
            "end_date": "2026-02-14",
            "frequency": "every_other_month",
            "notes_template": "Routine pest control service for River Bend.",
        },
        {
            "code": "harbor-cleaning-monthly",
            "scope": "building",
            "building_code": "HARBOR",
            "title": "Harbor Flats common-area cleaning",
            "category_slug": "cleaning",
            "vendor_slug": "river-city-cleaning",
            "amount": Decimal("160.00"),
            "start_date": "2024-01-06",
            "end_date": "2026-03-06",
            "frequency": "monthly",
            "notes_template": "Monthly common-area cleaning for Harbor Flats.",
        },
    ],
    "unit_events": [
        {
            "code": "oak-turnover-painting-unit-2b",
            "scope": "unit",
            "building_code": "OAK",
            "unit_code": "OAK-2",
            "title": "Turnover repaint for Oak Terrace 2B",
            "category_slug": "painting",
            "vendor_slug": "fresh-coat-painting",
            "amount": Decimal("875.00"),
            "expense_date": "2024-08-26",
            "notes_template": "Turnover repaint completed before next lease start.",
        },
        {
            "code": "oak-appliance-fridge-unit-1a",
            "scope": "unit",
            "building_code": "OAK",
            "unit_code": "OAK-1",
            "title": "Refrigerator replacement for Oak Terrace 1A",
            "category_slug": "appliances",
            "vendor_slug": "metro-appliance",
            "amount": Decimal("1185.00"),
            "expense_date": "2025-05-09",
            "notes_template": "Refrigerator replaced after service failure.",
        },
        {
            "code": "maple-plumbing-unit-3a",
            "scope": "unit",
            "building_code": "MAPLE",
            "unit_code": "MAPLE-2A",
            "title": "Plumbing repair for Maple Court 3A",
            "category_slug": "repairs",
            "vendor_slug": "summit-repair",
            "amount": Decimal("285.00"),
            "expense_date": "2025-11-18",
            "notes_template": "Unit-level plumbing repair completed.",
        },
        {
            "code": "harbor-turnover-cleaning-unit-1c",
            "scope": "unit",
            "building_code": "HARBOR",
            "unit_code": "HARBOR-C",
            "title": "Turnover cleaning for Harbor Flats 1C",
            "category_slug": "cleaning",
            "vendor_slug": "river-city-cleaning",
            "amount": Decimal("240.00"),
            "expense_date": "2024-06-28",
            "notes_template": "Vacancy turnover cleaning before relisting.",
        },
    ],
    "lease_events": [
        {
            "code": "harbor-lock-change-post-moveout",
            "scope": "lease",
            "lease_code": "LEASE-HARBOR-C-2022",
            "title": "Post move-out lock change",
            "category_slug": "locks-security",
            "vendor_slug": "secure-entry-locksmith",
            "amount": Decimal("145.00"),
            "expense_date": "2024-06-30",
            "notes_template": (
                "Lock change completed after lease end for security turnover."
            ),
        },
        {
            "code": "oak-lease-damage-repair",
            "scope": "lease",
            "lease_code": "LEASE-OAK-2-2021",
            "title": "Resident damage wall repair",
            "category_slug": "repairs",
            "vendor_slug": "summit-repair",
            "amount": Decimal("325.00"),
            "expense_date": "2025-02-10",
            "notes_template": "Lease-context repair completed during occupancy.",
        },
        {
            "code": "maple-lease-prep-cleaning",
            "scope": "lease",
            "lease_code": "LEASE-MAPLE-1A-2023",
            "title": "Lease preparation deep cleaning",
            "category_slug": "cleaning",
            "vendor_slug": "river-city-cleaning",
            "amount": Decimal("195.00"),
            "expense_date": "2025-02-25",
            "notes_template": "Pre-move-in cleaning associated with lease turnover.",
        },
    ],
}