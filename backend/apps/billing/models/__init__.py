# Filename: backend/apps/billing/models/__init__.py

"""
Public model exports for the billing domain.

This package exposes the canonical billing model surface used throughout the
application.

Why this file exists:
- Keeps imports stable after splitting the old monolithic `models.py`.
- Allows callers to continue using:
    from apps.billing.models import Charge, Payment, Allocation
- Centralizes the billing domain's public model API in one place.

Exports:
    Charge: Lease-scoped obligation model.
    Payment: Lease-scoped cash receipt model.
    Allocation: Application of payment amounts to charges.
    ChargeKind: Enum for supported charge categories.
    ChargeStatus: Enum for charge workflow state.
    PaymentMethod: Enum for supported payment methods.
"""

from __future__ import annotations

from apps.billing.choices import ChargeKind, ChargeStatus, PaymentMethod
from apps.billing.models.allocation import Allocation
from apps.billing.models.charge import Charge
from apps.billing.models.payment import Payment

__all__ = [
    "Allocation",
    "Charge",
    "ChargeKind",
    "ChargeStatus",
    "Payment",
    "PaymentMethod",
]