# Filename: backend/apps/billing/services/lease_ledger_service.py

"""
Lease ledger query service.

Builds a deterministic statement for a lease from:
- Charges
- Payments
- Allocations

No stored balances. All balances are derived.

Important note:
This service now returns a richer, frontend-ready lease ledger payload that
supports:
- lease header context
- summary cards
- charge/payment derived values
- allocation rows

It also preserves a few legacy field aliases so the current serializer layer
can be upgraded safely without another hard break.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Sum
from django.utils import timezone

from apps.billing.models import Allocation, Charge, Payment
from apps.leases.models import Lease


ZERO_DECIMAL = Decimal("0.00")


def _safe_decimal(value: Decimal | None) -> Decimal:
    """
    Normalize nullable decimal values.

    Args:
        value: Decimal-like value or None.

    Returns:
        Decimal: Safe decimal fallback.
    """
    return value if value is not None else ZERO_DECIMAL


def _build_entity_summary(
    entity: Any,
    *,
    label_fields: list[str],
) -> dict[str, Any] | None:
    """
    Build a lightweight related-entity display object.

    Args:
        entity: Related model instance.
        label_fields: Candidate attribute names for the display label.

    Returns:
        dict[str, Any] | None: Summary dict or None.
    """
    # Step 1: Guard missing related entity
    if entity is None:
        return None

    # Step 2: Resolve a display label from candidate fields
    label: str | None = None

    for field_name in label_fields:
        raw_value = getattr(entity, field_name, None)
        if isinstance(raw_value, str) and raw_value.strip():
            label = raw_value.strip()
            break

    # Step 3: Fallback to the id when no better label exists
    if label is None:
        entity_id = getattr(entity, "id", None)
        label = str(entity_id) if entity_id is not None else "Unknown"

    # Step 4: Return the summary object
    return {
        "id": getattr(entity, "id"),
        "label": label,
    }


def _build_tenant_names(lease: Lease) -> list[str]:
    """
    Best-effort tenant name extraction for the lease context.

    This helper is intentionally resilient because the exact lease-party
    relation names can vary slightly across refactors.

    Args:
        lease: Lease instance.

    Returns:
        list[str]: Distinct tenant display names in stable order.
    """
    # Step 1: Prepare containers
    names: list[str] = []
    seen: set[str] = set()

    # Step 2: Try common relation names used for tenant membership
    relation_candidates = [
        getattr(lease, "parties", None),
        getattr(lease, "lease_parties", None),
        getattr(lease, "tenants", None),
    ]

    for relation in relation_candidates:
        if relation is None:
            continue

        if hasattr(relation, "all"):
            items = list(relation.all())
        elif isinstance(relation, (list, tuple)):
            items = list(relation)
        else:
            continue

        for item in items:
            tenant = getattr(item, "tenant", item)

            full_name = getattr(tenant, "full_name", None)
            first_name = getattr(tenant, "first_name", None)
            last_name = getattr(tenant, "last_name", None)
            name = getattr(tenant, "name", None)

            candidate = None

            if isinstance(full_name, str) and full_name.strip():
                candidate = full_name.strip()
            elif isinstance(name, str) and name.strip():
                candidate = name.strip()
            else:
                joined = " ".join(
                    part.strip()
                    for part in [first_name or "", last_name or ""]
                    if isinstance(part, str) and part.strip()
                ).strip()
                if joined:
                    candidate = joined

            if candidate and candidate not in seen:
                seen.add(candidate)
                names.append(candidate)

    # Step 3: Fallback to singular primary tenant relations if present
    primary_tenant = getattr(lease, "tenant", None) or getattr(
        lease,
        "primary_tenant",
        None,
    )

    if primary_tenant is not None:
        full_name = getattr(primary_tenant, "full_name", None)
        if (
            isinstance(full_name, str)
            and full_name.strip()
            and full_name.strip() not in seen
        ):
            names.append(full_name.strip())

    # Step 4: Return stable list
    return names


def _build_lease_context(lease: Lease) -> dict[str, Any]:
    """
    Build the lease header context payload expected by the frontend.

    Args:
        lease: Lease instance.

    Returns:
        dict[str, Any]: Lease context payload.
    """
    # Step 1: Resolve related property context
    unit = getattr(lease, "unit", None)
    building = getattr(unit, "building", None) if unit is not None else None

    # Step 2: Resolve tenant display text
    tenant_names = _build_tenant_names(lease)
    tenant_display = ", ".join(tenant_names) if tenant_names else None

    # Step 3: Resolve due-day compatibility fields
    due_day = getattr(lease, "due_day", None)
    if due_day is None:
        due_day = getattr(lease, "rent_due_day", None)

    # Step 4: Return frontend-ready context object
    return {
        "lease_id": lease.id,
        "lease_status": getattr(lease, "status", None),
        "rent_amount": getattr(lease, "rent_amount", None),
        "due_day": due_day,
        "tenant_names": tenant_names,
        "tenant_display": tenant_display,
        "building_id": getattr(building, "id", None),
        "unit_id": getattr(unit, "id", None),
        "building": _build_entity_summary(
            building,
            label_fields=["code", "name", "address_line1"],
        ),
        "unit": _build_entity_summary(
            unit,
            label_fields=["label", "unit_label", "code"],
        ),
    }


class LeaseLedgerService:
    """Build ledger views for a lease."""

    @staticmethod
    def build_lease_ledger(*, organization_id: int, lease_id: int) -> dict[str, Any]:
        """
        Build the ledger for a lease.

        Args:
            organization_id: Organization PK for tenant boundary enforcement.
            lease_id: Lease PK.

        Returns:
            dict: Frontend-ready lease ledger payload.
        """
        # Step 1: Resolve org-safe lease context with property joins
        lease = (
            Lease.objects.select_related("unit__building")
            .filter(
                organization_id=organization_id,
                id=lease_id,
            )
            .first()
        )

        if lease is None:
            raise Lease.DoesNotExist(
                f"Lease {lease_id} not found for organization {organization_id}.",
            )

        # Step 2: Load full charge/payment model rows for this lease
        charges = list(
            Charge.objects.filter(
                organization_id=organization_id,
                lease_id=lease_id,
            ).order_by("due_date", "created_at", "id")
        )

        payments = list(
            Payment.objects.filter(
                organization_id=organization_id,
                lease_id=lease_id,
            ).order_by("paid_at", "created_at", "id")
        )

        # Step 3: Load explicit allocation rows for the lease
        allocations = list(
            Allocation.objects.filter(
                organization_id=organization_id,
                payment__lease_id=lease_id,
            )
            .select_related("payment", "charge")
            .order_by("created_at", "id")
        )

        # Step 4: Aggregate allocation totals by charge and payment
        charge_ids = [charge.id for charge in charges]
        payment_ids = [payment.id for payment in payments]

        alloc_by_charge_rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                charge_id__in=charge_ids,
            )
            .values("charge_id")
            .annotate(total=Sum("amount"))
            if charge_ids
            else []
        )

        alloc_by_payment_rows = (
            Allocation.objects.filter(
                organization_id=organization_id,
                payment_id__in=payment_ids,
            )
            .values("payment_id")
            .annotate(total=Sum("amount"))
            if payment_ids
            else []
        )

        alloc_by_charge = {
            row["charge_id"]: _safe_decimal(row["total"])
            for row in alloc_by_charge_rows
        }

        alloc_by_payment = {
            row["payment_id"]: _safe_decimal(row["total"])
            for row in alloc_by_payment_rows
        }

        # Step 5: Build charge rows and compute lease-side totals
        today = timezone.localdate()

        charge_rows: list[dict[str, Any]] = []
        total_charges = ZERO_DECIMAL
        total_allocated_to_charges = ZERO_DECIMAL
        overdue_amount = ZERO_DECIMAL

        for charge in charges:
            allocated_total = alloc_by_charge.get(charge.id, ZERO_DECIMAL)
            remaining_balance = charge.amount - allocated_total

            if remaining_balance < ZERO_DECIMAL:
                remaining_balance = ZERO_DECIMAL

            is_overdue = bool(
                remaining_balance > ZERO_DECIMAL and charge.due_date < today
            )

            if is_overdue:
                overdue_amount += remaining_balance

            total_charges += charge.amount
            total_allocated_to_charges += allocated_total

            charge_month = getattr(charge, "charge_month", None)
            status = getattr(charge, "status", None)

            charge_rows.append(
                {
                    "id": charge.id,
                    "lease_id": charge.lease_id,
                    "kind": charge.kind,
                    "status": status,
                    "amount": charge.amount,
                    "due_date": charge.due_date.isoformat(),
                    "charge_month": (
                        charge_month.isoformat() if charge_month else None
                    ),
                    "notes": charge.notes or "",
                    "allocated_total": allocated_total,
                    # Legacy alias for compatibility serializers
                    "balance": remaining_balance,
                    # Frontend-aligned key
                    "remaining_balance": remaining_balance,
                    "is_overdue": is_overdue,
                    "created_at": (
                        charge.created_at.isoformat()
                        if getattr(charge, "created_at", None)
                        else None
                    ),
                    "updated_at": (
                        charge.updated_at.isoformat()
                        if getattr(charge, "updated_at", None)
                        else None
                    ),
                }
            )

        # Step 6: Build payment rows and compute payment-side totals
        payment_rows: list[dict[str, Any]] = []
        total_payments = ZERO_DECIMAL
        total_allocated_from_payments = ZERO_DECIMAL

        for payment in payments:
            allocated_total = alloc_by_payment.get(payment.id, ZERO_DECIMAL)
            unapplied_amount = payment.amount - allocated_total

            if unapplied_amount < ZERO_DECIMAL:
                unapplied_amount = ZERO_DECIMAL

            total_payments += payment.amount
            total_allocated_from_payments += allocated_total

            payment_rows.append(
                {
                    "id": payment.id,
                    "lease_id": payment.lease_id,
                    "amount": payment.amount,
                    "paid_at": payment.paid_at.isoformat(),
                    "method": payment.method,
                    "external_ref": getattr(payment, "external_ref", None),
                    "notes": payment.notes or "",
                    "allocated_total": allocated_total,
                    # Legacy alias for compatibility serializers
                    "unapplied": unapplied_amount,
                    # Frontend-aligned key
                    "unapplied_amount": unapplied_amount,
                    "created_at": (
                        payment.created_at.isoformat()
                        if getattr(payment, "created_at", None)
                        else None
                    ),
                    "updated_at": (
                        payment.updated_at.isoformat()
                        if getattr(payment, "updated_at", None)
                        else None
                    ),
                }
            )

        # Step 7: Build explicit allocation rows
        allocation_rows: list[dict[str, Any]] = []

        for allocation in allocations:
            allocation_rows.append(
                {
                    "id": allocation.id,
                    "payment_id": allocation.payment_id,
                    "charge_id": allocation.charge_id,
                    "amount": allocation.amount,
                    "created_at": (
                        allocation.created_at.isoformat()
                        if getattr(allocation, "created_at", None)
                        else None
                    ),
                    "updated_at": (
                        allocation.updated_at.isoformat()
                        if getattr(allocation, "updated_at", None)
                        else None
                    ),
                }
            )

        # Step 8: Compute top-level totals
        outstanding_balance = total_charges - total_allocated_to_charges
        if outstanding_balance < ZERO_DECIMAL:
            outstanding_balance = ZERO_DECIMAL

        unapplied_amount = total_payments - total_allocated_from_payments
        if unapplied_amount < ZERO_DECIMAL:
            unapplied_amount = ZERO_DECIMAL

        # Step 9: Return a compatibility-safe, frontend-ready payload
        return {
            "lease_id": lease.id,
            "lease": _build_lease_context(lease),
            "totals": {
                # Legacy keys
                "charges": str(total_charges),
                "payments": str(total_payments),
                "allocated": str(total_allocated_to_charges),
                "balance": str(outstanding_balance),
                "unapplied_payments": str(unapplied_amount),
                # New frontend-aligned keys
                "total_charges": str(total_charges),
                "total_payments": str(total_payments),
                "total_allocated": str(total_allocated_to_charges),
                "outstanding_balance": str(outstanding_balance),
                "unapplied_amount": str(unapplied_amount),
                "overdue_amount": str(overdue_amount),
            },
            "charges": charge_rows,
            "payments": payment_rows,
            "allocations": allocation_rows,
        }