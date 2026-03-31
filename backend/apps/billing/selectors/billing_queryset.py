# Filename: backend/apps/billing/selectors/billing_queryset.py

"""
Shared queryset builders for the billing domain.

This module centralizes organization-scoped base querysets used by billing
selectors. The goal is to keep read paths consistent, safe, and easy to evolve.

Why this file exists:
- Prevents copy-paste queryset drift across selector modules.
- Keeps organization scoping explicit at the read boundary.
- Provides a shared place to add select_related optimizations for common
  billing relationships.

Design note:
These queryset helpers are intentionally conservative. They preload the
lease/unit/building ownership chain because that is the primary context path
for billing records in PortfolioOS / EstateIQ.
"""

from __future__ import annotations

from django.db.models import QuerySet

from apps.billing.models import Allocation, Charge, Payment


class BillingQuerysets:
    """
    Shared organization-scoped queryset builders for the billing domain.

    These helpers are used by selectors so that read paths start from a single,
    predictable organization-safe boundary.
    """

    @staticmethod
    def get_charge_base_queryset(*, organization_id: int) -> QuerySet[Charge]:
        """
        Return the base organization-scoped queryset for charges.

        Args:
            organization_id: Active organization primary key.

        Returns:
            QuerySet[Charge]: Organization-scoped charge queryset.
        """
        # Step 1: return the base org-safe charge queryset
        return (
            Charge.objects.filter(organization_id=organization_id)
            .select_related("lease", "lease__unit", "lease__unit__building")
        )

    @staticmethod
    def get_payment_base_queryset(*, organization_id: int) -> QuerySet[Payment]:
        """
        Return the base organization-scoped queryset for payments.

        Args:
            organization_id: Active organization primary key.

        Returns:
            QuerySet[Payment]: Organization-scoped payment queryset.
        """
        # Step 1: return the base org-safe payment queryset
        return (
            Payment.objects.filter(organization_id=organization_id)
            .select_related("lease", "lease__unit", "lease__unit__building")
        )

    @staticmethod
    def get_allocation_base_queryset(*, organization_id: int) -> QuerySet[Allocation]:
        """
        Return the base organization-scoped queryset for allocations.

        Args:
            organization_id: Active organization primary key.

        Returns:
            QuerySet[Allocation]: Organization-scoped allocation queryset.
        """
        # Step 1: return the base org-safe allocation queryset
        return (
            Allocation.objects.filter(organization_id=organization_id)
            .select_related(
                "payment",
                "payment__lease",
                "charge",
                "charge__lease",
            )
        )