# Filename: backend/apps/expenses/default_categories.py


"""Default category definitions for org bootstrap."""

from __future__ import annotations

DEFAULT_EXPENSE_CATEGORIES = [
    {
        "name": "Mortgage",
        "kind": "fixed",
        "description": "Mortgage principal and interest payments.",
        "sort_order": 10,
    },
    {
        "name": "Insurance",
        "kind": "fixed",
        "description": "Property and liability insurance premiums.",
        "sort_order": 20,
    },
    {
        "name": "Property Tax",
        "kind": "fixed",
        "description": "Real estate and local property tax expenses.",
        "sort_order": 30,
    },
    {
        "name": "Utilities",
        "kind": "variable",
        "description": "Electric, gas, water, sewer, and similar utility costs.",
        "sort_order": 40,
    },
    {
        "name": "Repairs And Maintenance",
        "kind": "variable",
        "description": "Routine repairs, upkeep, and maintenance work.",
        "sort_order": 50,
    },
    {
        "name": "Capex / Improvements",
        "kind": "capital",
        "description": "Capital improvements and major upgrade spending.",
        "sort_order": 60,
    },
    {
        "name": "Cleaning And Turnover",
        "kind": "variable",
        "description": "Cleaning, trash-out, and make-ready turnover costs.",
        "sort_order": 70,
    },
    {
        "name": "Landscaping / Snow Removal",
        "kind": "variable",
        "description": "Outdoor maintenance and seasonal removal services.",
        "sort_order": 80,
    },
    {
        "name": "Pest Control",
        "kind": "variable",
        "description": "Extermination and pest prevention services.",
        "sort_order": 90,
    },
    {
        "name": "Supplies",
        "kind": "variable",
        "description": "Operational supplies and small replacement items.",
        "sort_order": 100,
    },
    {
        "name": "Professional Services",
        "kind": "administrative",
        "description": "Legal, accounting, and consulting services.",
        "sort_order": 110,
    },
    {
        "name": "Software / Admin",
        "kind": "administrative",
        "description": "Software subscriptions and office admin costs.",
        "sort_order": 120,
    },
    {
        "name": "Other",
        "kind": "other",
        "description": "Fallback category for uncategorized expenses.",
        "sort_order": 130,
    },
]