# Filename: backend/apps/expenses/choices.py
"""
Choice enums for the expenses domain.

This module centralizes all expense-related enumerations so that:
- model field choices stay readable
- service-layer validation can reuse the same canonical values
- serializers and filters can reference one source of truth
- future reporting and AI layers can depend on stable domain vocabulary

These enums intentionally model explicit financial workflow states rather than
loose free-text values.
"""

from __future__ import annotations

from django.db import models


class ExpenseScope(models.TextChoices):
    """Represents the structural ownership scope of an expense record."""

    ORGANIZATION = "organization", "Organization"
    BUILDING = "building", "Building"
    UNIT = "unit", "Unit"
    LEASE = "lease", "Lease"


class ExpenseStatus(models.TextChoices):
    """Represents the operational lifecycle state of an expense."""

    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    DUE = "due", "Due"
    PAID = "paid", "Paid"
    CANCELLED = "cancelled", "Cancelled"


class ReimbursementStatus(models.TextChoices):
    """Represents the reimbursement state for an expense."""

    NOT_APPLICABLE = "not_applicable", "Not applicable"
    REIMBURSABLE = "reimbursable", "Reimbursable"
    SUBMITTED = "submitted", "Submitted"
    REIMBURSED = "reimbursed", "Reimbursed"


class ExpenseSource(models.TextChoices):
    """Represents how an expense entered the system."""

    MANUAL = "manual", "Manual"
    IMPORT = "import", "Import"
    SYSTEM = "system", "System"
    AI_SUGGESTED = "ai_suggested", "AI suggested"


class ExpenseCategoryKind(models.TextChoices):
    """Represents a high-level category grouping for reporting and intelligence."""

    OPERATING = "operating", "Operating"
    CAPITAL = "capital", "Capital"
    ADMIN = "admin", "Admin"
    TAX = "tax", "Tax"
    INSURANCE = "insurance", "Insurance"
    UTILITIES = "utilities", "Utilities"
    TURNOVER = "turnover", "Turnover"
    REPAIR_MAINTENANCE = "repair_maintenance", "Repair & maintenance"
    PROFESSIONAL_SERVICES = "professional_services", "Professional services"
    OTHER = "other", "Other"


class VendorType(models.TextChoices):
    """Represents an optional vendor classification."""

    CONTRACTOR = "contractor", "Contractor"
    UTILITY = "utility", "Utility"
    GOVERNMENT = "government", "Government"
    INSURANCE = "insurance", "Insurance"
    SOFTWARE = "software", "Software"
    MANAGEMENT = "management", "Management"
    SUPPLIER = "supplier", "Supplier"
    PROFESSIONAL = "professional", "Professional"
    OTHER = "other", "Other"