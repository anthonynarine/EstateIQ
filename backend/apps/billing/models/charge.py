# Filename: backend/apps/billing/models/charge.py

"""
Charge model for the billing domain.

This model represents a lease-scoped financial obligation.

Design intent:
- A charge records what is owed.
- Charges are immutable financial facts in the ledger-first model.
- Remaining balance is derived from allocations, not stored directly.

Current refactor note:
This file intentionally preserves the current behavior from the original
`apps/billing/models.py` implementation so we can split the monolithic model
file safely before introducing deeper billing enhancements like `charge_month`
or charge workflow status.
"""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.billing.choices import ChargeKind


class Charge(models.Model):
    """
    Lease-scoped amount owed.

    A charge is an obligation posted against a lease ledger. In the current
    billing model, charges may represent rent, late fees, or miscellaneous
    lease-related amounts.

    Examples:
        - Monthly rent due on the 1st
        - Late fee assessed after missed payment
        - Miscellaneous lease-scoped adjustment

    Important:
        This model does not store a mutable balance field. Charge balance is
        derived from:

            charge.amount - sum(allocation.amount for allocations on this charge)

    Attributes:
        organization: Tenant boundary for the record.
        lease: Lease that owns the obligation.
        kind: Category of charge (rent, late fee, misc).
        amount: Positive decimal amount owed.
        due_date: Date the charge becomes due.
        notes: Optional internal note for staff context.
        created_by: User who created the charge, if applicable.
        created_at: Timestamp when the charge was recorded.
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.PROTECT,
        related_name="charges",
        help_text="Tenant boundary. Every charge belongs to exactly one organization.",
    )
    lease = models.ForeignKey(
        "leases.Lease",
        on_delete=models.PROTECT,
        related_name="charges",
        help_text="The lease that owns this charge.",
    )
    kind = models.CharField(
        max_length=32,
        choices=ChargeKind.choices,
        help_text="The charge type, such as rent, late fee, or misc.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount owed for this charge. Must be greater than zero.",
    )
    due_date = models.DateField(
        help_text="Due date used for delinquency and payment application order.",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional internal note for this charge.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="charges_created",
        help_text="User who created the charge.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Server timestamp when this charge was created.",
    )

    class Meta:
        """
        Django model metadata for Charge.

        We keep the current uniqueness rule intact during the refactor so
        monthly charge generation remains idempotent under the existing design.
        """

        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "lease", "due_date"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="billing_charge_amount_gt_0",
            ),
            models.UniqueConstraint(
                fields=["organization", "lease", "kind", "due_date"],
                name="billing_unique_charge_per_kind_due_date",
            ),
        ]

    def clean(self) -> None:
        """
        Validate cross-model integrity for organization ownership.

        Raises:
            ValidationError: If the charge organization does not match the
                organization of the referenced lease.
        """
        # Step 1: enforce org boundary consistency between charge and lease
        if self.lease_id and self.organization_id:
            if self.lease.organization_id != self.organization_id:
                raise ValidationError(
                    "Charge.organization must match Charge.lease.organization."
                )

    def __str__(self) -> str:
        """
        Return a readable string representation for debugging and admin use.

        Returns:
            str: Human-readable charge summary.
        """
        # Step 1: return compact model summary
        return f"Charge({self.kind}, {self.amount}, due={self.due_date})"