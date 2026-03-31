# Filename: backend/apps/billing/services/lease_ledger_service.py

"""
Lease ledger service for the billing domain.

This module exposes the lease-ledger read workflow used by the API layer.

Why this file exists:
- Preserves a stable service entry point for views and future callers.
- Keeps the service layer orchestration-focused.
- Delegates query-heavy ledger assembly to the selector layer.

Refactor note:
The actual lease-ledger read logic now lives in
`apps.billing.selectors.ledger_selectors.LeaseLedgerSelectors`.
This service intentionally stays thin so the read-model boundary is explicit.
"""

from __future__ import annotations

import logging
from typing import Any

from apps.billing.selectors import LeaseLedgerSelectors

logger = logging.getLogger(__name__)


class LeaseLedgerService:
    """
    Service facade for lease-ledger reads.

    This class preserves the existing service entry point while delegating the
    deterministic read-model assembly to selectors.
    """

    @classmethod
    def build_lease_ledger(
        cls,
        *,
        organization_id: int,
        lease_id: int,
    ) -> dict[str, Any]:
        """
        Build the lease ledger for the requested lease.

        Args:
            organization_id: Active organization primary key.
            lease_id: Lease primary key.

        Returns:
            dict[str, Any]: Serializer-ready lease-ledger payload.
        """
        # Step 1: delegate the read-model assembly to selectors
        ledger_payload = LeaseLedgerSelectors.build_lease_ledger(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        # Step 2: emit a lightweight operational log
        logger.info(
            "billing.lease_ledger.built",
            extra={
                "organization_id": organization_id,
                "lease_id": lease_id,
                "charge_count": len(ledger_payload.get("charges", [])),
                "payment_count": len(ledger_payload.get("payments", [])),
            },
        )

        return ledger_payload