# Filename: apps/billing/services/allocation_service.py

"""
Payment allocation service.

Hybrid policy:
- Auto mode (default): FIFO allocation to oldest open charges first.
- Manual mode (optional): caller specifies exact allocations.

Guardrails:
- Allocation amounts must be positive.
- Sum(allocations) <= payment.amount.
- No allocation may exceed remaining charge balance.
- Payment and charges must share org + lease boundaries.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable, List, Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum

from apps.billing.models import Allocation, Charge, Payment


@dataclass(frozen=True)
class AllocationRequest:
    """Request payload for manual allocation."""
    charge_id: int
    amount: Decimal


@dataclass(frozen=True)
class AllocationResult:
    """Result object returned after allocating a payment."""
    payment_id: int
    allocated_total: Decimal
    unapplied_amount: Decimal
    allocation_ids: List[int]


class AllocationService:
    """Service-layer allocation rules for payments."""

    @staticmethod
    def _charge_allocated_total(charge_id: int) -> Decimal:
        # Step 1: compute allocated so far for a charge
        total = (
            Allocation.objects.filter(charge_id=charge_id)
            .aggregate(total=Sum("amount"))
            .get("total")
        )
        return total or Decimal("0.00")

    @staticmethod
    def _payment_allocated_total(payment_id: int) -> Decimal:
        # Step 1: compute allocated so far for a payment
        total = (
            Allocation.objects.filter(payment_id=payment_id)
            .aggregate(total=Sum("amount"))
            .get("total")
        )
        return total or Decimal("0.00")

    @staticmethod
    def _remaining_charge_balance(charge: Charge) -> Decimal:
        # Step 1: remaining = charge.amount - allocated
        allocated = AllocationService._charge_allocated_total(charge.id)
        remaining = charge.amount - allocated
        return remaining if remaining > 0 else Decimal("0.00")

    @staticmethod
    def _validate_org_lease_boundary(payment: Payment, charge: Charge) -> None:
        # Step 1: ensure tenant boundaries match
        if payment.organization_id != charge.organization_id:
            raise ValidationError("Payment and Charge must belong to the same organization.")
        if payment.lease_id != charge.lease_id:
            raise ValidationError("Payment and Charge must belong to the same lease.")

    @staticmethod
    def allocate_payment_auto(payment_id: int) -> AllocationResult:
        """
        Auto FIFO allocation: apply payment to oldest open charges first.

        Args:
            payment_id: Payment primary key.

        Returns:
            AllocationResult with allocations created and unapplied remainder.
        """
        # Step 1: lock payment row to prevent concurrent allocations
        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .select_related("lease", "organization")
                .get(id=payment_id)
            )

            # Step 2: compute remaining payment balance (unallocated amount)
            already_allocated = AllocationService._payment_allocated_total(payment.id)
            remaining_payment = payment.amount - already_allocated
            if remaining_payment <= 0:
                return AllocationResult(
                    payment_id=payment.id,
                    allocated_total=already_allocated,
                    unapplied_amount=Decimal("0.00"),
                    allocation_ids=[],
                )

            # Step 3: load open charges FIFO: due_date then created_at
            charges = (
                Charge.objects.select_for_update()
                .filter(
                    organization_id=payment.organization_id,
                    lease_id=payment.lease_id,
                )
                .order_by("due_date", "created_at", "id")
            )

            allocation_ids: List[int] = []
            allocated_now = Decimal("0.00")

            # Step 4: allocate across charges until payment exhausted
            for charge in charges:
                if remaining_payment <= 0:
                    break

                AllocationService._validate_org_lease_boundary(payment, charge)

                charge_remaining = AllocationService._remaining_charge_balance(charge)
                if charge_remaining <= 0:
                    continue

                amount_to_apply = min(remaining_payment, charge_remaining)

                alloc = Allocation.objects.create(
                    organization_id=payment.organization_id,
                    payment_id=payment.id,
                    charge_id=charge.id,
                    amount=amount_to_apply,
                )
                allocation_ids.append(alloc.id)
                allocated_now += amount_to_apply
                remaining_payment -= amount_to_apply

            # Step 5: return result
            return AllocationResult(
                payment_id=payment.id,
                allocated_total=already_allocated + allocated_now,
                unapplied_amount=remaining_payment if remaining_payment > 0 else Decimal("0.00"),
                allocation_ids=allocation_ids,
            )

    @staticmethod
    def allocate_payment_manual(payment_id: int, requests: Iterable[AllocationRequest]) -> AllocationResult:
        """
        Manual allocation: caller specifies exact allocations.

        Args:
            payment_id: Payment primary key.
            requests: Iterable of AllocationRequest (charge_id, amount).

        Returns:
            AllocationResult with allocations created and unapplied remainder.
        """
        reqs = list(requests)

        # Step 1: basic request validation
        if not reqs:
            raise ValidationError("Manual allocation requires at least one allocation request.")

        for req in reqs:
            if req.amount <= 0:
                raise ValidationError("Allocation amount must be > 0.")

        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .select_related("lease", "organization")
                .get(id=payment_id)
            )

            already_allocated = AllocationService._payment_allocated_total(payment.id)
            remaining_payment = payment.amount - already_allocated
            if remaining_payment <= 0:
                return AllocationResult(
                    payment_id=payment.id,
                    allocated_total=already_allocated,
                    unapplied_amount=Decimal("0.00"),
                    allocation_ids=[],
                )

            # Step 2: lock referenced charges
            charge_ids = [r.charge_id for r in reqs]
            charges_by_id = {
                c.id: c
                for c in Charge.objects.select_for_update().filter(id__in=charge_ids)
            }

            allocation_ids: List[int] = []
            allocated_now = Decimal("0.00")

            # Step 3: apply each requested allocation in order
            for req in reqs:
                if req.charge_id not in charges_by_id:
                    raise ValidationError(f"Charge {req.charge_id} does not exist.")

                charge = charges_by_id[req.charge_id]
                AllocationService._validate_org_lease_boundary(payment, charge)

                if req.amount > remaining_payment:
                    raise ValidationError("Requested allocations exceed remaining payment amount.")

                charge_remaining = AllocationService._remaining_charge_balance(charge)
                if req.amount > charge_remaining:
                    raise ValidationError("Requested allocation exceeds remaining charge balance.")

                alloc = Allocation.objects.create(
                    organization_id=payment.organization_id,
                    payment_id=payment.id,
                    charge_id=charge.id,
                    amount=req.amount,
                )
                allocation_ids.append(alloc.id)
                allocated_now += req.amount
                remaining_payment -= req.amount

            return AllocationResult(
                payment_id=payment.id,
                allocated_total=already_allocated + allocated_now,
                unapplied_amount=remaining_payment if remaining_payment > 0 else Decimal("0.00"),
                allocation_ids=allocation_ids,
            )
