"""
Manual charge write service for the billing domain.

This module owns explicit manual lease-charge creation for non-rent
obligations.

Why this file exists:
- Keeps manual charge write rules out of views and serializers.
- Preserves a clean separation between:
  - monthly rent generation
  - manual non-rent charge entry
- Provides a dedicated service-layer boundary for lease-scoped manual
  receivables such as late fees and miscellaneous charges.

Design principles:
- lease-scoped
- organization-safe
- transaction-safe
- explicit rather than automatic
- safe for reuse by future internal workflows

Important product rule:
This service is for manual non-rent charge entry only.
It must not be used to create monthly rent charges. Rent charges remain the
responsibility of the dedicated rent generation workflow.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.billing.models import Charge, ChargeKind
from apps.leases.models import Lease

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ManualChargeCreateResult:
    """
    Result returned after creating a manual lease charge.

    Attributes:
        charge_id: Primary key of the created charge.
        lease_id: Primary key of the lease that owns the charge.
        organization_id: Primary key of the owning organization.
        kind: Charge kind that was created.
        amount: Charge amount.
        due_date: Charge due date.
    """

    charge_id: int
    lease_id: int
    organization_id: int
    kind: str
    amount: Decimal
    due_date: date


class ChargeWriteService:
    """
    Service layer for explicit manual lease charge creation.

    This service owns the backend write rules for non-rent lease charges.
    It should be used for manual receivables such as:
    - late fees
    - miscellaneous lease-scoped obligations

    It should not be used for:
    - monthly rent generation
    - negative charges / credits
    - automated late-fee policy logic
    """

    ALLOWED_MANUAL_KINDS = {
        ChargeKind.LATE_FEE,
        ChargeKind.MISC,
    }

    @staticmethod
    def _field_names(model_class: type[Any]) -> set[str]:
        """
        Return concrete Django model field names for the provided model class.

        Args:
            model_class: Django model class to inspect.

        Returns:
            set[str]: Concrete model field names.
        """
        # Step 1: Inspect Django model metadata.
        return {field.name for field in model_class._meta.fields}

    @classmethod
    def _validate_kind(cls, *, kind: str) -> None:
        """
        Validate that the charge kind is supported for manual entry.

        Args:
            kind: Requested charge kind.

        Raises:
            ValidationError: If the charge kind is not allowed.
        """
        # Step 1: Keep rent creation out of the manual charge workflow.
        if kind == ChargeKind.RENT:
            raise ValidationError(
                "Manual charge creation does not support kind='rent'. "
                "Use the monthly rent generation workflow instead."
            )

        # Step 2: Enforce the current phase scope.
        if kind not in cls.ALLOWED_MANUAL_KINDS:
            raise ValidationError(
                "Unsupported manual charge kind. Supported kinds are "
                "'late_fee' and 'misc'."
            )

    @staticmethod
    def _validate_amount(*, amount: Decimal) -> None:
        """
        Validate that the manual charge amount is positive.

        Args:
            amount: Requested charge amount.

        Raises:
            ValidationError: If the amount is zero or negative.
        """
        # Step 1: Reject non-positive amounts explicitly.
        if amount <= Decimal("0.00"):
            raise ValidationError("Charge amount must be greater than 0.")

    @staticmethod
    def _normalize_notes(*, notes: str | None) -> str:
        """
        Normalize notes for consistent persistence.

        Args:
            notes: Optional notes string.

        Returns:
            str: Normalized notes value.
        """
        # Step 1: Normalize missing notes to an empty string.
        if notes is None:
            return ""

        # Step 2: Trim surrounding whitespace.
        return notes.strip()

    @classmethod
    def _build_charge_create_payload(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        kind: str,
        amount: Decimal,
        due_date: date,
        notes: str,
        created_by_id: int | None,
    ) -> dict[str, Any]:
        """
        Build a schema-tolerant Charge create payload.

        Args:
            organization_id: Owning organization primary key.
            lease_id: Owning lease primary key.
            kind: Charge kind.
            amount: Positive charge amount.
            due_date: Due date for the charge.
            notes: Normalized internal notes.
            created_by_id: Optional actor primary key.

        Returns:
            dict[str, Any]: Charge creation payload.
        """
        # Step 1: Build required current-schema fields.
        payload: dict[str, Any] = {
            "organization_id": organization_id,
            "lease_id": lease_id,
            "kind": kind,
            "amount": amount,
            "due_date": due_date,
            "notes": notes,
        }

        field_names = cls._field_names(Charge)

        # Step 2: Add optional actor metadata when supported by the schema.
        if created_by_id is not None and "created_by" in field_names:
            payload["created_by_id"] = created_by_id

        return payload

    @classmethod
    def create_manual_lease_charge(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        kind: str,
        amount: Decimal,
        due_date: date,
        notes: str = "",
        created_by_id: int | None = None,
    ) -> Charge:
        """
        Create a manual non-rent charge for a lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Target lease primary key.
            kind: Manual charge kind. Supported values:
                - late_fee
                - misc
            amount: Positive charge amount.
            due_date: Due date for the obligation.
            notes: Optional internal notes.
            created_by_id: Optional actor primary key for audit-aware schemas.

        Returns:
            Charge: The newly created charge record.

        Raises:
            ValidationError: If:
                - the lease does not belong to the organization
                - the amount is invalid
                - the charge kind is invalid for this workflow
        """
        # Step 1: Validate request-level business rules.
        cls._validate_kind(kind=kind)
        cls._validate_amount(amount=amount)
        normalized_notes = cls._normalize_notes(notes=notes)

        with transaction.atomic():
            # Step 2: Lock the lease row so the write happens against a stable
            # lease context and org boundary.
            lease = (
                Lease.objects.select_for_update()
                .filter(
                    id=lease_id,
                    organization_id=organization_id,
                )
                .first()
            )

            if lease is None:
                raise ValidationError(
                    "Lease was not found for the active organization."
                )

            # Step 3: Persist the charge as an explicit lease-scoped obligation.
            charge = Charge.objects.create(
                **cls._build_charge_create_payload(
                    organization_id=organization_id,
                    lease_id=lease.id,
                    kind=kind,
                    amount=amount,
                    due_date=due_date,
                    notes=normalized_notes,
                    created_by_id=created_by_id,
                )
            )

            # Step 4: Emit an operational log with safe structured context.
            logger.info(
                "billing.charge.created",
                extra={
                    "organization_id": organization_id,
                    "lease_id": lease.id,
                    "charge_id": charge.id,
                    "kind": kind,
                    "amount": str(amount),
                    "due_date": due_date.isoformat(),
                    "actor_id": created_by_id,
                },
            )

            return charge