# Filename: backend/apps/billing/services/payment_write_service.py

"""
Payment write service for the billing domain.

This module owns the lease-scoped payment mutation workflow.

Why this file exists:
- Keeps payment creation and allocation logic out of DRF views.
- Gives the billing domain a canonical write contract that matches the
  public serializer/view contract.
- Preserves the ledger-first model by recording payments and allocations
  without storing mutable balances.

Design notes:
- This service is organization-scoped and lease-scoped.
- All writes happen inside a single atomic transaction.
- Manual allocations are validated explicitly.
- Automatic allocation uses deterministic FIFO ordering:
  oldest open charge first.
- This service intentionally raises DRF ValidationError for now because it is
  called directly from DRF views and we want clean API error responses during
  the refactor. Later, this can be upgraded to a domain-specific exception
  layer if you want stricter framework separation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Mapping, Sequence

from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from apps.billing.models import Allocation, Charge, Payment
from apps.leases.models import Lease

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PaymentAllocationInput:
    """Normalized manual allocation instruction."""

    charge_id: int
    amount: Decimal


@dataclass(frozen=True)
class CreatePaymentResult:
    """
    Result payload for payment creation.

    Attributes:
        payment_id: Primary key of the created payment.
        allocated_total: Total amount allocated to charges.
        unapplied_amount: Remaining payment amount not allocated to charges.
        allocation_ids: Created allocation primary keys, in creation order.
    """

    payment_id: int
    allocated_total: Decimal
    unapplied_amount: Decimal
    allocation_ids: list[int]


class PaymentWriteService:
    """
    Service for recording lease-scoped payments.

    Public contract:
    - create one Payment
    - optionally create one or more Allocation rows
    - return a stable result for the API response layer

    This service does not compute a lease ledger read model.
    That belongs to the read/query side of the billing domain.
    """

    VALID_ALLOCATION_MODES = {"auto", "manual"}

    @classmethod
    def record_payment(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        amount: Decimal,
        paid_at: datetime,
        method: str,
        external_ref: str | None = None,
        notes: str | None = None,
        allocation_mode: str = "auto",
        allocations: Sequence[Mapping[str, Any]] | None = None,
        created_by_id: int | None = None,
    ) -> CreatePaymentResult:
        """
        Record a payment and optionally allocate it to one or more charges.

        Args:
            organization_id: Active organization primary key.
            lease_id: Target lease primary key.
            amount: Payment amount.
            paid_at: Datetime when the payment was received.
            method: Payment method string from the API contract.
            external_ref: Optional external payment reference.
            notes: Optional payment notes.
            allocation_mode: Either "auto" or "manual".
            allocations: Optional manual allocation instructions.
            created_by_id: Authenticated actor primary key.

        Returns:
            CreatePaymentResult: Stable payment creation result.

        Raises:
            ValidationError: If the lease is invalid, the amount is invalid,
                allocation instructions are invalid, or an allocation would
                over-apply cash to a charge.
        """
        # Step 1: normalize scalar inputs
        normalized_amount = cls._to_decimal(amount, field_name="amount")
        normalized_allocations = cls._normalize_allocations(
            allocations=allocations or []
        )

        # Step 2: validate request-level mutation rules
        cls._validate_allocation_mode(
            allocation_mode=allocation_mode,
            normalized_allocations=normalized_allocations,
        )

        # Step 3: perform all writes inside one transaction
        with transaction.atomic():
            lease = cls._get_locked_lease(
                organization_id=organization_id,
                lease_id=lease_id,
            )

            payment = cls._create_payment(
                organization_id=organization_id,
                lease_id=lease.id,
                amount=normalized_amount,
                paid_at=paid_at,
                method=method,
                external_ref=external_ref,
                notes=notes,
                created_by_id=created_by_id,
            )

            if allocation_mode == "manual":
                allocation_ids, allocated_total = cls._apply_manual_allocations(
                    organization_id=organization_id,
                    lease_id=lease.id,
                    payment=payment,
                    normalized_allocations=normalized_allocations,
                    created_by_id=created_by_id,
                )
            else:
                allocation_ids, allocated_total = cls._auto_allocate_payment(
                    organization_id=organization_id,
                    lease_id=lease.id,
                    payment=payment,
                    created_by_id=created_by_id,
                )

        # Step 4: compute the unapplied remainder
        unapplied_amount = normalized_amount - allocated_total
        if unapplied_amount < Decimal("0.00"):
            raise ValidationError(
                {"amount": "Allocated total cannot exceed the payment amount."}
            )

        # Step 5: emit a production-safe log record
        logger.info(
            "billing.payment.created",
            extra={
                "organization_id": organization_id,
                "lease_id": lease_id,
                "payment_id": payment.id,
                "actor_id": created_by_id,
                "allocation_mode": allocation_mode,
                "allocated_total": str(allocated_total),
                "unapplied_amount": str(unapplied_amount),
                "allocation_count": len(allocation_ids),
            },
        )

        return CreatePaymentResult(
            payment_id=payment.id,
            allocated_total=allocated_total,
            unapplied_amount=unapplied_amount,
            allocation_ids=allocation_ids,
        )

    @classmethod
    def _validate_allocation_mode(
        cls,
        *,
        allocation_mode: str,
        normalized_allocations: Sequence[PaymentAllocationInput],
    ) -> None:
        """
        Validate the selected allocation mode.

        Args:
            allocation_mode: Requested allocation mode.
            normalized_allocations: Parsed manual allocation instructions.

        Raises:
            ValidationError: If the mode is invalid or manual mode lacks rows.
        """
        # Step 1: validate supported values
        if allocation_mode not in cls.VALID_ALLOCATION_MODES:
            raise ValidationError(
                {
                    "allocation_mode": (
                        "Allocation mode must be either 'auto' or 'manual'."
                    )
                }
            )

        # Step 2: manual mode requires at least one row
        if allocation_mode == "manual" and not normalized_allocations:
            raise ValidationError(
                {
                    "allocations": (
                        "Manual allocation mode requires at least one allocation row."
                    )
                }
            )

    @staticmethod
    def _to_decimal(value: Any, *, field_name: str) -> Decimal:
        """
        Convert a value to Decimal and validate positivity.

        Args:
            value: Raw numeric-like value.
            field_name: Field name used in validation messages.

        Returns:
            Decimal: Normalized decimal value.

        Raises:
            ValidationError: If the value is invalid or non-positive.
        """
        # Step 1: coerce to Decimal safely
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError(
                {field_name: f"{field_name} must be a valid decimal amount."}
            ) from exc

        # Step 2: require a positive amount
        if decimal_value <= Decimal("0.00"):
            raise ValidationError(
                {field_name: f"{field_name} must be greater than zero."}
            )

        return decimal_value

    @classmethod
    def _normalize_allocations(
        cls,
        *,
        allocations: Sequence[Mapping[str, Any]],
    ) -> list[PaymentAllocationInput]:
        """
        Normalize raw allocation payload rows.

        Args:
            allocations: Raw allocation rows from the API payload.

        Returns:
            list[PaymentAllocationInput]: Parsed allocation rows.

        Raises:
            ValidationError: If rows are malformed, duplicated, or invalid.
        """
        # Step 1: allow empty allocation lists
        if not allocations:
            return []

        normalized_rows: list[PaymentAllocationInput] = []
        seen_charge_ids: set[int] = set()

        # Step 2: parse each row explicitly
        for index, row in enumerate(allocations):
            charge_id = row.get("charge_id")
            raw_amount = row.get("amount")

            if charge_id in (None, ""):
                raise ValidationError(
                    {
                        "allocations": (
                            f"Allocation row {index + 1} must include a charge_id."
                        )
                    }
                )

            try:
                normalized_charge_id = int(charge_id)
            except (TypeError, ValueError) as exc:
                raise ValidationError(
                    {
                        "allocations": (
                            f"Allocation row {index + 1} has an invalid charge_id."
                        )
                    }
                ) from exc

            if normalized_charge_id in seen_charge_ids:
                raise ValidationError(
                    {
                        "allocations": (
                            "Duplicate charge_id entries are not allowed in a single "
                            "manual allocation payload."
                        )
                    }
                )

            normalized_amount = cls._to_decimal(
                raw_amount,
                field_name="allocations.amount",
            )

            normalized_rows.append(
                PaymentAllocationInput(
                    charge_id=normalized_charge_id,
                    amount=normalized_amount,
                )
            )
            seen_charge_ids.add(normalized_charge_id)

        return normalized_rows

    @staticmethod
    def _field_names(model_class: type[Any]) -> set[str]:
        """
        Return concrete model field names.

        Args:
            model_class: Django model class.

        Returns:
            set[str]: Field names defined on the model.
        """
        # Step 1: inspect model metadata
        return {field.name for field in model_class._meta.fields}

    @classmethod
    def _get_locked_lease(
        cls,
        *,
        organization_id: int,
        lease_id: int,
    ) -> Lease:
        """
        Fetch and lock the target lease inside the current transaction.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            Lease: Locked lease instance.

        Raises:
            ValidationError: If the lease does not belong to the organization.
        """
        # Step 1: lock the lease row for mutation safety
        lease = (
            Lease.objects.select_for_update()
            .filter(
                id=lease_id,
                organization_id=organization_id,
            )
            .first()
        )

        # Step 2: enforce org-safe lease ownership
        if lease is None:
            raise ValidationError(
                {"lease_id": "Lease not found for the active organization."}
            )

        return lease

    @classmethod
    def _create_payment(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        amount: Decimal,
        paid_at: datetime,
        method: str,
        external_ref: str | None,
        notes: str | None,
        created_by_id: int | None,
    ) -> Payment:
        """
        Create the Payment row.

        This helper is schema-tolerant for common audit fields so the service
        stays stable while the billing app is being hardened.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.
            amount: Normalized payment amount.
            paid_at: Payment received datetime.
            method: Payment method string.
            external_ref: Optional external payment reference.
            notes: Optional free-text notes.
            created_by_id: Actor primary key.

        Returns:
            Payment: Created payment instance.
        """
        # Step 1: gather supported model fields
        field_names = cls._field_names(Payment)

        # Step 2: build required payload
        payload: dict[str, Any] = {
            "organization_id": organization_id,
            "lease_id": lease_id,
            "amount": amount,
            "paid_at": paid_at,
            "method": method,
        }

        # Step 3: add optional API fields when present
        if external_ref not in (None, "") and "external_ref" in field_names:
            payload["external_ref"] = external_ref

        if notes not in (None, "") and "notes" in field_names:
            payload["notes"] = notes

        # Step 4: add optional audit fields when present
        if created_by_id is not None and "created_by" in field_names:
            payload["created_by_id"] = created_by_id

        if created_by_id is not None and "updated_by" in field_names:
            payload["updated_by_id"] = created_by_id

        # Step 5: create and return the payment
        return Payment.objects.create(**payload)

    @classmethod
    def _create_allocation(
        cls,
        *,
        organization_id: int,
        payment: Payment,
        charge: Charge,
        amount: Decimal,
        created_by_id: int | None,
    ) -> Allocation:
        """
        Create a single Allocation row.

        Args:
            organization_id: Active organization primary key.
            payment: Payment instance receiving the allocation.
            charge: Charge instance receiving the allocation.
            amount: Allocation amount.
            created_by_id: Actor primary key.

        Returns:
            Allocation: Created allocation instance.
        """
        # Step 1: gather supported model fields
        field_names = cls._field_names(Allocation)

        # Step 2: build required payload
        payload: dict[str, Any] = {
            "organization_id": organization_id,
            "payment_id": payment.id,
            "charge_id": charge.id,
            "amount": amount,
        }

        # Step 3: add optional audit fields when present
        if created_by_id is not None and "created_by" in field_names:
            payload["created_by_id"] = created_by_id

        if created_by_id is not None and "updated_by" in field_names:
            payload["updated_by_id"] = created_by_id

        # Step 4: create and return the allocation
        return Allocation.objects.create(**payload)

    @classmethod
    def _charge_allocated_totals(
        cls,
        *,
        organization_id: int,
        charge_ids: Sequence[int],
    ) -> dict[int, Decimal]:
        """
        Return current allocation totals for the given charges.

        Args:
            organization_id: Active organization primary key.
            charge_ids: Charge primary keys to aggregate.

        Returns:
            dict[int, Decimal]: Mapping of charge_id to allocated total.
        """
        # Step 1: short-circuit empty workloads
        if not charge_ids:
            return {}

        # Step 2: aggregate current allocations by charge
        rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                charge_id__in=charge_ids,
            )
            .values("charge_id")
            .annotate(total=Sum("amount"))
        )

        return {
            row["charge_id"]: row["total"] or Decimal("0.00")
            for row in rows
        }

    @classmethod
    def _get_locked_manual_charges(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        charge_ids: Sequence[int],
    ) -> dict[int, Charge]:
        """
        Fetch and lock manual-allocation charges.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.
            charge_ids: Charge primary keys requested by the client.

        Returns:
            dict[int, Charge]: Locked charges keyed by charge id.

        Raises:
            ValidationError: If any charge is missing or belongs to a different
                lease or organization.
        """
        # Step 1: lock target charge rows inside the transaction
        charges = list(
            Charge.objects.select_for_update()
            .filter(
                organization_id=organization_id,
                lease_id=lease_id,
                id__in=charge_ids,
            )
            .order_by("due_date", "created_at", "id")
        )

        # Step 2: verify every requested charge belongs to this lease/org
        if len(charges) != len(charge_ids):
            raise ValidationError(
                {
                    "allocations": (
                        "One or more charges do not belong to the active "
                        "organization and lease."
                    )
                }
            )

        return {charge.id: charge for charge in charges}

    @classmethod
    def _apply_manual_allocations(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        payment: Payment,
        normalized_allocations: Sequence[PaymentAllocationInput],
        created_by_id: int | None,
    ) -> tuple[list[int], Decimal]:
        """
        Apply explicit manual allocations to the payment.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.
            payment: Created payment instance.
            normalized_allocations: Parsed manual allocation rows.
            created_by_id: Actor primary key.

        Returns:
            tuple[list[int], Decimal]: Allocation ids and allocated total.

        Raises:
            ValidationError: If the requested allocations exceed the payment
                amount or any charge's remaining balance.
        """
        # Step 1: ensure requested allocations do not exceed the payment amount
        requested_total = sum(
            (row.amount for row in normalized_allocations),
            Decimal("0.00"),
        )
        if requested_total > payment.amount:
            raise ValidationError(
                {
                    "allocations": (
                        "Total manual allocation amount cannot exceed the "
                        "payment amount."
                    )
                }
            )

        # Step 2: fetch and lock all referenced charges
        charge_ids = [row.charge_id for row in normalized_allocations]
        charge_map = cls._get_locked_manual_charges(
            organization_id=organization_id,
            lease_id=lease_id,
            charge_ids=charge_ids,
        )

        # Step 3: load current allocated totals for remaining-balance checks
        allocated_totals = cls._charge_allocated_totals(
            organization_id=organization_id,
            charge_ids=charge_ids,
        )

        allocation_ids: list[int] = []
        allocated_total = Decimal("0.00")

        # Step 4: validate and create each allocation in payload order
        for row in normalized_allocations:
            charge = charge_map[row.charge_id]
            current_allocated = allocated_totals.get(charge.id, Decimal("0.00"))
            remaining_balance = charge.amount - current_allocated

            if remaining_balance <= Decimal("0.00"):
                raise ValidationError(
                    {
                        "allocations": (
                            f"Charge {charge.id} has no remaining balance."
                        )
                    }
                )

            if row.amount > remaining_balance:
                raise ValidationError(
                    {
                        "allocations": (
                            f"Allocation for charge {charge.id} exceeds the "
                            "remaining charge balance."
                        )
                    }
                )

            allocation = cls._create_allocation(
                organization_id=organization_id,
                payment=payment,
                charge=charge,
                amount=row.amount,
                created_by_id=created_by_id,
            )

            allocation_ids.append(allocation.id)
            allocated_total += row.amount
            allocated_totals[charge.id] = current_allocated + row.amount

        return allocation_ids, allocated_total

    @classmethod
    def _auto_allocate_payment(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        payment: Payment,
        created_by_id: int | None,
    ) -> tuple[list[int], Decimal]:
        """
        Allocate a payment automatically using FIFO ordering.

        Ordering rule:
        - oldest due_date first
        - then created_at
        - then id

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.
            payment: Created payment instance.
            created_by_id: Actor primary key.

        Returns:
            tuple[list[int], Decimal]: Allocation ids and allocated total.
        """
        # Step 1: load and lock all candidate charges for the lease
        open_charges = list(
            Charge.objects.select_for_update()
            .filter(
                organization_id=organization_id,
                lease_id=lease_id,
            )
            .order_by("due_date", "created_at", "id")
        )

        charge_ids = [charge.id for charge in open_charges]
        allocated_totals = cls._charge_allocated_totals(
            organization_id=organization_id,
            charge_ids=charge_ids,
        )

        allocation_ids: list[int] = []
        allocated_total = Decimal("0.00")
        remaining_payment = payment.amount

        # Step 2: apply cash to oldest open balances first
        for charge in open_charges:
            if remaining_payment <= Decimal("0.00"):
                break

            current_allocated = allocated_totals.get(charge.id, Decimal("0.00"))
            remaining_charge_balance = charge.amount - current_allocated

            if remaining_charge_balance <= Decimal("0.00"):
                continue

            amount_to_allocate = min(remaining_payment, remaining_charge_balance)

            allocation = cls._create_allocation(
                organization_id=organization_id,
                payment=payment,
                charge=charge,
                amount=amount_to_allocate,
                created_by_id=created_by_id,
            )

            allocation_ids.append(allocation.id)
            allocated_total += amount_to_allocate
            remaining_payment -= amount_to_allocate
            allocated_totals[charge.id] = current_allocated + amount_to_allocate

        return allocation_ids, allocated_total