# Filename: backend/apps/billing/models/allocation.py

"""
Allocation model for the billing domain.

This model represents how part of a payment is applied to a specific charge.

Design intent:
- Payments represent money received.
- Charges represent money owed.
- Allocations are the only records that reduce a charge's remaining balance.

Important:
- Allocations are lease-scoped through both the payment and the charge.
- Allocation correctness is enforced partly here and partly in the service
  layer.
- We do not store mutable balances on either Payment or Charge. Instead,
  balances are derived from allocation totals.
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Allocation(models.Model):
    """
    Application of part of a payment to a charge.

    An allocation maps a positive amount from one payment onto one charge.
    Multiple allocations may exist for a single payment, and multiple payments
    may contribute allocations toward the same charge.

    Guardrails:
        - amount must be greater than zero
        - allocation organization must match payment organization
        - allocation organization must match charge organization
        - payment and charge must belong to the same lease
    """

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.PROTECT,
        related_name="allocations",
        help_text="Tenant boundary. Every allocation belongs to exactly one organization.",
    )
    payment = models.ForeignKey(
        "billing.Payment",
        on_delete=models.PROTECT,
        related_name="allocations",
        help_text="The payment providing funds for this allocation.",
    )
    charge = models.ForeignKey(
        "billing.Charge",
        on_delete=models.PROTECT,
        related_name="allocations",
        help_text="The charge being paid down by this allocation.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount applied from the payment to the charge. Must be greater than zero.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Server timestamp when this allocation was created.",
    )

    class Meta:
        """Django model metadata for Allocation."""

        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "payment"]),
            models.Index(fields=["organization", "charge"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="billing_allocation_amount_gt_0",
            )
        ]

    def clean(self) -> None:
        """
        Validate org and lease integrity across related billing records.

        Raises:
            ValidationError: If allocation org boundaries or lease boundaries
                are violated.
        """
        # Step 1: ensure allocation org matches payment org
        if self.organization_id and self.payment_id:
            if self.payment.organization_id != self.organization_id:
                raise ValidationError(
                    "Allocation.organization must match Allocation.payment.organization."
                )

        # Step 2: ensure allocation org matches charge org
        if self.organization_id and self.charge_id:
            if self.charge.organization_id != self.organization_id:
                raise ValidationError(
                    "Allocation.organization must match Allocation.charge.organization."
                )

        # Step 3: ensure payment and charge belong to the same lease
        if self.payment_id and self.charge_id:
            if self.payment.lease_id != self.charge.lease_id:
                raise ValidationError(
                    "Allocation.payment and Allocation.charge must reference the same lease."
                )

    @staticmethod
    def sum_allocated_for_payment(payment_id: int) -> Decimal:
        """
        Return the total allocated amount for a payment.

        Args:
            payment_id: Primary key of the payment.

        Returns:
            Decimal: Sum of allocation amounts for the payment, defaulting to 0.
        """
        # Step 1: aggregate total allocation amount for the payment
        return (
            Allocation.objects.filter(payment_id=payment_id)
            .aggregate(total=models.Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

    @staticmethod
    def sum_allocated_for_charge(charge_id: int) -> Decimal:
        """
        Return the total allocated amount for a charge.

        Args:
            charge_id: Primary key of the charge.

        Returns:
            Decimal: Sum of allocation amounts for the charge, defaulting to 0.
        """
        # Step 1: aggregate total allocation amount for the charge
        return (
            Allocation.objects.filter(charge_id=charge_id)
            .aggregate(total=models.Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

    def __str__(self) -> str:
        """
        Return a readable string representation for debugging and admin use.

        Returns:
            str: Human-readable allocation summary.
        """
        # Step 1: return compact model summary
        return f"Allocation({self.amount})"