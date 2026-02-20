# Filename: apps/billing/models.py

"""
Billing domain models for PortfolioOS.

This app is ledger-first:
- Charges represent amounts owed (rent, fees, misc).
- Payments represent money received (cash, Zelle, ACH, etc.).
- Allocations map payments to charges and are the only thing that reduces a charge balance.

Balances are derived (Charge.amount - sum(allocations)).
We never store "balance" as a column to avoid drift and ensure deterministic reporting.
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class ChargeKind(models.TextChoices):
    """Types of amounts owed by a lease."""
    RENT = "rent", "Rent"
    LATE_FEE = "late_fee", "Late fee"
    MISC = "misc", "Misc"


class PaymentMethod(models.TextChoices):
    """How the landlord received funds (not a processor integration)."""
    CASH = "cash", "Cash"
    ZELLE = "zelle", "Zelle"
    ACH = "ach", "ACH"
    CHECK = "check", "Check"
    OTHER = "other", "Other"


class Charge(models.Model):
    """
    A Charge is an immutable financial fact: an amount owed on a due date.

    Example:
        RENT $1,800 due 2026-03-01

    Notes:
        - Charges are created by lease schedule generation and/or policy actions (fees).
        - A Charge is "paid" when allocations sum to the charge amount.
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
        help_text="The lease that owns this charge (rent/fees for this lease).",
    )
    kind = models.CharField(
        max_length=32,
        choices=ChargeKind.choices,
        help_text="The type of charge (rent, late fee, misc).",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount owed for this charge. Must be > 0.",
    )
    due_date = models.DateField(
        help_text="Date the charge is due. Used for delinquency and FIFO allocation ordering.",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional internal note (e.g. 'March rent', 'Fee assessed due to NSF check').",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="charges_created",
        help_text="User who created the charge (if created manually/admin).",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Server timestamp when the charge record was created.",
    )

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "lease", "due_date"]),
        ]
        constraints = [
            models.CheckConstraint(check=Q(amount__gt=0), name="billing_charge_amount_gt_0"),
            # ✅ New Code: hard idempotency guard for monthly charge generation
            models.UniqueConstraint(
                fields=["organization", "lease", "kind", "due_date"],
                name="billing_unique_charge_per_kind_due_date",
            ),
        ]

    def clean(self) -> None:
        # Step 1: defense-in-depth boundary check (org must match lease.org)
        if self.lease_id and self.organization_id:
            if self.lease.organization_id != self.organization_id:
                raise ValidationError("Charge.organization must match Charge.lease.organization.")

    def __str__(self) -> str:
        return f"Charge({self.kind}, {self.amount}, due={self.due_date})"


class Payment(models.Model):
    """
    A Payment is an immutable financial fact: money received for a lease.

    This can represent:
    - Cash collected in person
    - Zelle transfer
    - ACH
    - Check

    Payments do not reduce balances directly.
    Allocations define which charges this payment applies to.
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
        help_text="Amount received. Must be > 0.",
    )
    paid_at = models.DateTimeField(
        help_text="When funds were received (not when entered into the system).",
    )
    method = models.CharField(
        max_length=16,
        choices=PaymentMethod.choices,
        default=PaymentMethod.OTHER,
        help_text="How the payment was received (cash, Zelle, ACH, check, etc.).",
    )
    external_ref = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Optional reference ID (check #, Zelle confirmation, bank memo, etc.).",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional internal note (e.g. 'Partial payment', 'Paid by roommate').",
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
        help_text="Server timestamp when the payment record was created.",
    )

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "lease", "paid_at"]),
        ]
        constraints = [
            models.CheckConstraint(check=Q(amount__gt=0), name="billing_payment_amount_gt_0"),
        ]

    def clean(self) -> None:
        # Step 1: defense-in-depth boundary check (org must match lease.org)
        if self.lease_id and self.organization_id:
            if self.lease.organization_id != self.organization_id:
                raise ValidationError("Payment.organization must match Payment.lease.organization.")

    def __str__(self) -> str:
        return f"Payment({self.amount}, paid_at={self.paid_at}, method={self.method})"


class Allocation(models.Model):
    """
    Allocation applies some amount of a Payment to a specific Charge.

    Guardrails (enforced in service layer + validated here):
    - Allocation.amount > 0
    - payment and charge must be for the same lease
    - org boundaries must match
    - totals must not exceed payment.amount or charge.amount (service-layer responsibility)
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
        help_text="The charge that is being paid down by this allocation.",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount applied from the payment to the charge. Must be > 0.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Server timestamp when the allocation record was created.",
    )

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "payment"]),
            models.Index(fields=["organization", "charge"]),
        ]
        constraints = [
            models.CheckConstraint(check=Q(amount__gt=0), name="billing_allocation_amount_gt_0"),
        ]

    def clean(self) -> None:
        # Step 1: org boundary checks
        if self.organization_id and self.payment_id:
            if self.payment.organization_id != self.organization_id:
                raise ValidationError("Allocation.organization must match Allocation.payment.organization.")

        if self.organization_id and self.charge_id:
            if self.charge.organization_id != self.organization_id:
                raise ValidationError("Allocation.organization must match Allocation.charge.organization.")

        # Step 2: lease boundary checks
        if self.payment_id and self.charge_id:
            if self.payment.lease_id != self.charge.lease_id:
                raise ValidationError("Allocation.payment and Allocation.charge must reference the same lease.")

    @staticmethod
    def sum_allocated_for_payment(payment_id: int) -> Decimal:
        """Return total allocated for a payment (Decimal)."""
        # Step 1: compute sum allocated for a payment
        return (
            Allocation.objects.filter(payment_id=payment_id)
            .aggregate(total=models.Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

    @staticmethod
    def sum_allocated_for_charge(charge_id: int) -> Decimal:
        """Return total allocated for a charge (Decimal)."""
        # Step 1: compute sum allocated for a charge
        return (
            Allocation.objects.filter(charge_id=charge_id)
            .aggregate(total=models.Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

    def __str__(self) -> str:
        return f"Allocation({self.amount})"
