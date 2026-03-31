# Filename: backend/apps/billing/services/allocation_service.py

"""
Payment allocation service for the billing domain.

This module owns payment-to-charge allocation workflows.

Why this file exists:
- Keeps allocation business rules out of views and serializers.
- Preserves the ledger-first model by deriving balances from immutable records.
- Performs allocation math inside transactions with locked rows.

Supported modes:
- Auto mode: FIFO allocation to the oldest open charges first.
- Manual mode: caller specifies exact charge allocations.

Guardrails:
- Allocation amounts must be positive.
- Total allocations cannot exceed the remaining payment amount.
- No allocation may exceed a charge's remaining balance.
- Payment and charges must share the same organization and lease.
- Allocation writes must be transaction-safe and concurrency-aware.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Iterable

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum

from apps.billing.models import Allocation, Charge, Payment

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AllocationRequest:
    """
    Request payload for one manual allocation row.

    Attributes:
        charge_id: Primary key of the target charge.
        amount: Amount to apply to that charge.
    """

    charge_id: int
    amount: Decimal


@dataclass(frozen=True)
class AllocationResult:
    """
    Result returned after allocating a payment.

    Attributes:
        payment_id: Primary key of the payment.
        allocated_total: Total amount allocated from this payment after the
            current operation completes.
        unapplied_amount: Remaining unapplied amount on the payment.
        allocation_ids: Primary keys of allocations created in this call.
    """

    payment_id: int
    allocated_total: Decimal
    unapplied_amount: Decimal
    allocation_ids: list[int]


class AllocationService:
    """
    Service-layer allocation rules for payments.

    This service is responsible for write-path allocation behavior and should
    remain transaction-safe. It does not build UI-oriented read models.
    """

    @staticmethod
    def _field_names(model_class: type[Any]) -> set[str]:
        """
        Return concrete Django model field names for the provided model class.

        Args:
            model_class: Django model class to inspect.

        Returns:
            set[str]: Concrete model field names.
        """
        # Step 1: inspect model metadata
        return {field.name for field in model_class._meta.fields}

    @staticmethod
    def _validate_org_lease_boundary(payment: Payment, charge: Charge) -> None:
        """
        Ensure a payment and charge share the same org and lease boundary.

        Args:
            payment: Payment instance being allocated.
            charge: Target charge instance.

        Raises:
            ValidationError: If organization or lease boundaries differ.
        """
        # Step 1: enforce same organization
        if payment.organization_id != charge.organization_id:
            raise ValidationError(
                "Payment and Charge must belong to the same organization."
            )

        # Step 2: enforce same lease
        if payment.lease_id != charge.lease_id:
            raise ValidationError(
                "Payment and Charge must belong to the same lease."
            )

    @staticmethod
    def _validate_positive_amount(amount: Decimal) -> None:
        """
        Ensure an allocation amount is positive.

        Args:
            amount: Allocation amount to validate.

        Raises:
            ValidationError: If the amount is not greater than zero.
        """
        # Step 1: enforce positive allocation amounts
        if amount <= Decimal("0.00"):
            raise ValidationError("Allocation amount must be > 0.")

    @staticmethod
    def _allocation_totals_by_charge_ids(
        *,
        organization_id: int,
        charge_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return allocation totals keyed by charge ID.

        Args:
            organization_id: Active organization primary key.
            charge_ids: Charge IDs to aggregate.

        Returns:
            dict[int, Decimal]: Allocation totals keyed by charge ID.
        """
        # Step 1: short-circuit empty workloads
        if not charge_ids:
            return {}

        # Step 2: aggregate allocations by charge inside the org boundary
        rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                charge_id__in=charge_ids,
            )
            .values("charge_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["charge_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @staticmethod
    def _allocation_totals_by_payment_ids(
        *,
        organization_id: int,
        payment_ids: list[int],
    ) -> dict[int, Decimal]:
        """
        Return allocation totals keyed by payment ID.

        Args:
            organization_id: Active organization primary key.
            payment_ids: Payment IDs to aggregate.

        Returns:
            dict[int, Decimal]: Allocation totals keyed by payment ID.
        """
        # Step 1: short-circuit empty workloads
        if not payment_ids:
            return {}

        # Step 2: aggregate allocations by payment inside the org boundary
        rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                payment_id__in=payment_ids,
            )
            .values("payment_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["payment_id"]: (row["total"] or Decimal("0.00"))
            for row in rows
        }

    @classmethod
    def _payment_allocated_total(cls, *, payment: Payment) -> Decimal:
        """
        Return the current allocated total for a payment.

        Args:
            payment: Locked payment instance.

        Returns:
            Decimal: Total allocated from the payment.
        """
        # Step 1: aggregate allocations for the payment
        return cls._allocation_totals_by_payment_ids(
            organization_id=payment.organization_id,
            payment_ids=[payment.id],
        ).get(payment.id, Decimal("0.00"))

    @staticmethod
    def _remaining_charge_balance(
        *,
        charge: Charge,
        allocated_total: Decimal,
    ) -> Decimal:
        """
        Return the remaining balance on a charge.

        Args:
            charge: Charge instance.
            allocated_total: Current total allocated to the charge.

        Returns:
            Decimal: Remaining unpaid balance, floored at zero.
        """
        # Step 1: derive remaining charge balance
        remaining = charge.amount - allocated_total
        if remaining < Decimal("0.00"):
            return Decimal("0.00")

        return remaining

    @classmethod
    def _build_allocation_create_payload(
        cls,
        *,
        organization_id: int,
        payment_id: int,
        charge_id: int,
        amount: Decimal,
        created_by_id: int | None,
    ) -> dict[str, Any]:
        """
        Build a schema-tolerant allocation create payload.

        Args:
            organization_id: Active organization primary key.
            payment_id: Payment primary key.
            charge_id: Charge primary key.
            amount: Allocation amount.
            created_by_id: Optional actor primary key.

        Returns:
            dict[str, Any]: Allocation create payload.
        """
        # Step 1: build required fields
        payload: dict[str, Any] = {
            "organization_id": organization_id,
            "payment_id": payment_id,
            "charge_id": charge_id,
            "amount": amount,
        }

        field_names = cls._field_names(Allocation)

        # Step 2: add optional audit fields when supported
        if created_by_id is not None and "created_by" in field_names:
            payload["created_by_id"] = created_by_id

        if created_by_id is not None and "updated_by" in field_names:
            payload["updated_by_id"] = created_by_id

        return payload

    @classmethod
    def _create_allocation(
        cls,
        *,
        organization_id: int,
        payment_id: int,
        charge_id: int,
        amount: Decimal,
        created_by_id: int | None,
    ) -> Allocation:
        """
        Create one allocation row.

        Args:
            organization_id: Active organization primary key.
            payment_id: Payment primary key.
            charge_id: Charge primary key.
            amount: Allocation amount.
            created_by_id: Optional actor primary key.

        Returns:
            Allocation: Created allocation instance.
        """
        # Step 1: build the schema-safe payload
        payload = cls._build_allocation_create_payload(
            organization_id=organization_id,
            payment_id=payment_id,
            charge_id=charge_id,
            amount=amount,
            created_by_id=created_by_id,
        )

        # Step 2: create and return the allocation
        return Allocation.objects.create(**payload)

    @staticmethod
    def _get_locked_payment(*, payment_id: int) -> Payment:
        """
        Fetch and lock the target payment.

        Args:
            payment_id: Payment primary key.

        Returns:
            Payment: Locked payment instance.
        """
        # Step 1: lock the payment row for transaction-safe allocation
        return (
            Payment.objects.select_for_update()
            .select_related("lease", "organization")
            .get(id=payment_id)
        )

    @staticmethod
    def _validate_manual_requests(
        requests: list[AllocationRequest],
    ) -> None:
        """
        Validate manual allocation requests.

        Args:
            requests: Manual allocation requests in caller order.

        Raises:
            ValidationError: If requests are empty, contain non-positive
                amounts, or duplicate charge IDs.
        """
        # Step 1: require at least one allocation request
        if not requests:
            raise ValidationError(
                "Manual allocation requires at least one allocation request."
            )

        seen_charge_ids: set[int] = set()

        # Step 2: enforce valid positive amounts and no duplicate charge rows
        for request in requests:
            AllocationService._validate_positive_amount(request.amount)

            if request.charge_id in seen_charge_ids:
                raise ValidationError(
                    "Manual allocation cannot include the same charge more than once."
                )

            seen_charge_ids.add(request.charge_id)

    @classmethod
    def allocate_payment_auto(
        cls,
        payment_id: int,
        created_by_id: int | None = None,
    ) -> AllocationResult:
        """
        Allocate a payment automatically using FIFO ordering.

        FIFO order:
        - oldest due date first
        - then created_at
        - then id

        Args:
            payment_id: Payment primary key.
            created_by_id: Optional actor primary key for audit-aware models.

        Returns:
            AllocationResult: Allocation result for the payment.
        """
        # Step 1: lock the payment and compute remaining unapplied balance
        with transaction.atomic():
            payment = cls._get_locked_payment(payment_id=payment_id)

            already_allocated = cls._payment_allocated_total(payment=payment)
            remaining_payment = payment.amount - already_allocated

            if remaining_payment <= Decimal("0.00"):
                return AllocationResult(
                    payment_id=payment.id,
                    allocated_total=already_allocated,
                    unapplied_amount=Decimal("0.00"),
                    allocation_ids=[],
                )

            # Step 2: lock candidate charges in FIFO order
            charges = list(
                Charge.objects.select_for_update()
                .filter(
                    organization_id=payment.organization_id,
                    lease_id=payment.lease_id,
                )
                .order_by("due_date", "created_at", "id")
            )

            # Step 3: build current allocated totals by charge once
            allocation_map = cls._allocation_totals_by_charge_ids(
                organization_id=payment.organization_id,
                charge_ids=[charge.id for charge in charges],
            )

            allocation_ids: list[int] = []
            allocated_now = Decimal("0.00")

            # Step 4: allocate across open charges until the payment is exhausted
            for charge in charges:
                if remaining_payment <= Decimal("0.00"):
                    break

                cls._validate_org_lease_boundary(payment, charge)

                current_allocated_total = allocation_map.get(charge.id, Decimal("0.00"))
                charge_remaining = cls._remaining_charge_balance(
                    charge=charge,
                    allocated_total=current_allocated_total,
                )

                if charge_remaining <= Decimal("0.00"):
                    continue

                amount_to_apply = min(remaining_payment, charge_remaining)

                allocation = cls._create_allocation(
                    organization_id=payment.organization_id,
                    payment_id=payment.id,
                    charge_id=charge.id,
                    amount=amount_to_apply,
                    created_by_id=created_by_id,
                )

                allocation_ids.append(allocation.id)
                allocated_now += amount_to_apply
                remaining_payment -= amount_to_apply
                allocation_map[charge.id] = current_allocated_total + amount_to_apply

            # Step 5: log the allocation operation
            logger.info(
                "billing.allocation.auto_completed",
                extra={
                    "organization_id": payment.organization_id,
                    "lease_id": payment.lease_id,
                    "payment_id": payment.id,
                    "allocated_now": str(allocated_now),
                    "allocated_total": str(already_allocated + allocated_now),
                    "unapplied_amount": str(
                        remaining_payment if remaining_payment > Decimal("0.00") else Decimal("0.00")
                    ),
                    "allocation_count": len(allocation_ids),
                    "actor_id": created_by_id,
                },
            )

            # Step 6: return the stable result contract
            return AllocationResult(
                payment_id=payment.id,
                allocated_total=already_allocated + allocated_now,
                unapplied_amount=(
                    remaining_payment
                    if remaining_payment > Decimal("0.00")
                    else Decimal("0.00")
                ),
                allocation_ids=allocation_ids,
            )

    @classmethod
    def allocate_payment_manual(
        cls,
        payment_id: int,
        requests: Iterable[AllocationRequest],
        created_by_id: int | None = None,
    ) -> AllocationResult:
        """
        Allocate a payment manually using explicit caller instructions.

        Args:
            payment_id: Payment primary key.
            requests: Allocation requests in caller-defined order.
            created_by_id: Optional actor primary key for audit-aware models.

        Returns:
            AllocationResult: Allocation result for the payment.

        Raises:
            ValidationError: If the manual allocation payload is invalid or
                exceeds payment/charge balances.
        """
        # Step 1: normalize and validate request rows
        normalized_requests = list(requests)
        cls._validate_manual_requests(normalized_requests)

        with transaction.atomic():
            # Step 2: lock the payment and compute remaining unapplied balance
            payment = cls._get_locked_payment(payment_id=payment_id)

            already_allocated = cls._payment_allocated_total(payment=payment)
            remaining_payment = payment.amount - already_allocated

            if remaining_payment <= Decimal("0.00"):
                return AllocationResult(
                    payment_id=payment.id,
                    allocated_total=already_allocated,
                    unapplied_amount=Decimal("0.00"),
                    allocation_ids=[],
                )

            # Step 3: ensure the manual request total fits within the payment
            requested_total = sum(
                (request.amount for request in normalized_requests),
                Decimal("0.00"),
            )
            if requested_total > remaining_payment:
                raise ValidationError(
                    "Requested allocations exceed remaining payment amount."
                )

            # Step 4: lock the referenced charges
            requested_charge_ids = [request.charge_id for request in normalized_requests]
            charges = list(
                Charge.objects.select_for_update().filter(id__in=requested_charge_ids)
            )
            charges_by_id = {charge.id: charge for charge in charges}

            if len(charges_by_id) != len(requested_charge_ids):
                raise ValidationError("One or more requested charges do not exist.")

            # Step 5: build current allocated totals by charge once
            allocation_map = cls._allocation_totals_by_charge_ids(
                organization_id=payment.organization_id,
                charge_ids=requested_charge_ids,
            )

            allocation_ids: list[int] = []
            allocated_now = Decimal("0.00")

            # Step 6: apply each request in caller order
            for request in normalized_requests:
                charge = charges_by_id[request.charge_id]
                cls._validate_org_lease_boundary(payment, charge)

                current_allocated_total = allocation_map.get(charge.id, Decimal("0.00"))
                charge_remaining = cls._remaining_charge_balance(
                    charge=charge,
                    allocated_total=current_allocated_total,
                )

                if request.amount > charge_remaining:
                    raise ValidationError(
                        "Requested allocation exceeds remaining charge balance."
                    )

                allocation = cls._create_allocation(
                    organization_id=payment.organization_id,
                    payment_id=payment.id,
                    charge_id=charge.id,
                    amount=request.amount,
                    created_by_id=created_by_id,
                )

                allocation_ids.append(allocation.id)
                allocated_now += request.amount
                remaining_payment -= request.amount
                allocation_map[charge.id] = current_allocated_total + request.amount

            # Step 7: log the allocation operation
            logger.info(
                "billing.allocation.manual_completed",
                extra={
                    "organization_id": payment.organization_id,
                    "lease_id": payment.lease_id,
                    "payment_id": payment.id,
                    "allocated_now": str(allocated_now),
                    "allocated_total": str(already_allocated + allocated_now),
                    "unapplied_amount": str(
                        remaining_payment if remaining_payment > Decimal("0.00") else Decimal("0.00")
                    ),
                    "allocation_count": len(allocation_ids),
                    "actor_id": created_by_id,
                },
            )

            # Step 8: return the stable result contract
            return AllocationResult(
                payment_id=payment.id,
                allocated_total=already_allocated + allocated_now,
                unapplied_amount=(
                    remaining_payment
                    if remaining_payment > Decimal("0.00")
                    else Decimal("0.00")
                ),
                allocation_ids=allocation_ids,
            )