# Filename: backend/apps/billing/choices.py

"""
Choice enums for the billing domain.

This module centralizes user-facing and domain-facing enumerations used by
the billing / ledger app.

Why this file exists:
- Keeps model files focused on data structure and validation.
- Prevents enum definitions from being duplicated across models, serializers,
  and future admin/forms code.
- Gives the billing domain a single, stable place for shared constants.

Observability note:
These enum values also become important event metadata for logs and audit
records. For example:
- billing.charge.generated -> kind=rent
- billing.payment.created -> method=zelle
- billing.charge.voided -> status=void

Because of that, these values should be treated as stable contracts once the
frontend and audit/event layers begin depending on them.
"""

from __future__ import annotations

from django.db import models


class ChargeKind(models.TextChoices):
    """
    Supported billing charge categories.

    These represent amounts owed on a lease ledger.

    Values:
        RENT: Standard recurring monthly rent obligation.
        LATE_FEE: Penalty assessed for late payment.
        MISC: Any other lease-scoped charge not covered by the standard types.
    """

    RENT = "rent", "Rent"
    LATE_FEE = "late_fee", "Late fee"
    MISC = "misc", "Misc"


class ChargeStatus(models.TextChoices):
    """
    Workflow status for a charge record.

    We keep this enum available now even if the current model does not yet
    persist a status column. That gives us a clean place to grow into
    reversible financial workflows later without redefining the contract.

    Values:
        POSTED: Active charge that participates in ledger math.
        VOID: Charge exists historically but should no longer count as an
            active obligation.
    """

    POSTED = "posted", "Posted"
    VOID = "void", "Void"


class PaymentMethod(models.TextChoices):
    """
    Supported methods for recording externally received funds.

    Important:
    This domain records money that was already received outside the platform
    in MVP, so these values describe receipt method rather than processor
    integration state.

    Values:
        CASH: Cash received directly.
        ZELLE: Zelle transfer.
        ACH: ACH transfer.
        CHECK: Paper check.
        VENMO: Venmo transfer.
        OTHER: Fallback for unsupported or unspecified methods.
    """

    CASH = "cash", "Cash"
    ZELLE = "zelle", "Zelle"
    ACH = "ach", "ACH"
    CHECK = "check", "Check"
    VENMO = "venmo", "Venmo"
    OTHER = "other", "Other"