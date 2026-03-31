# Filename: backend/apps/billing/models/payment.py

"""
Payment model for the billing domain.

This model represents money received for a lease.

Design intent:
- A payment records cash receipt.
- Payments are immutable financial facts in the ledger-first model.
- Payments do not reduce balances by themselves.
- Allocations determine how a payment is applied to one or more charges.
"""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.billing.choices import PaymentMethod


class Payment(models.Model):
    """Lease-scoped money received.

    A payment records funds that were received outside the platform and then
    entered into the system by a user.

    Important:
        Payments do not reduce a lease balance directly. The financial effect
        of a payment is realized only through Allocation records that apply
        part or all of the payment to specific charges.
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="Tenant boundary. Every payment belongs to exactly one organization.",
    )
    lease = models.ForeignKey(
        "leases.Lease",
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="The lease this payment is associated with.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount received. Must be greater than zero.",
    )
    paid_at = models.DateTimeField(
        help_text="When funds were received, not when the record was entered.",
    )
    method = models.CharField(
        max_length=16,
        choices=PaymentMethod.choices,
        default=PaymentMethod.OTHER,
        help_text="How the payment was received.",
    )
    external_ref = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Optional external reference such as check number or transfer note.",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional internal note for this payment.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments_created",
        help_text="User who recorded the payment.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Server timestamp when this payment was created.",
    )

    class Meta:
        """Django model metadata for Payment."""

        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "lease", "paid_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="billing_payment_amount_gt_0",
            )
        ]

    def clean(self) -> None:
        """Validate cross-model integrity for organization ownership.

        Raises:
            ValidationError: If the payment organization does not match the
                organization of the referenced lease.
        """
        # Step 1: enforce org boundary consistency between payment and lease
        if self.lease_id and self.organization_id:
            if self.lease.organization_id != self.organization_id:
                raise ValidationError(
                    "Payment.organization must match Payment.lease.organization."
                )

    def __str__(self) -> str:
        """Return a readable string representation for debugging and admin use."""
        # Step 1: return compact model summary
        return f"Payment({self.amount}, paid_at={self.paid_at}, method={self.method})"