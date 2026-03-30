# Filename: backend/apps/billing/views/ledger_views.py

"""
Lease-ledger views for the billing domain.

This module contains endpoints responsible for returning lease-level ledger
read models.

Why this file exists:
- Keeps ledger read endpoints separate from charge-generation, payment-write,
  and reporting endpoints.
- Makes the billing view layer easier to navigate by grouping lease-ledger
  reads in a dedicated module.
- Preserves a thin-view architecture where the view resolves tenancy,
  delegates ledger computation to a service, and serializes the result.

Current refactor note:
This module preserves the current behavior from the original monolithic
`apps/billing/views.py` file while moving the code into a focused view module.
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from apps.billing.serializers import LeaseLedgerResponseSerializer
from apps.billing.services.lease_ledger_service import LeaseLedgerService
from apps.billing.views.mixins import OrgScopedAPIView
from apps.leases.models import Lease


class LeaseLedgerView(OrgScopedAPIView):
    """
    Return the computed ledger statement for a lease.

    This endpoint is lease-scoped and organization-scoped. It does not compute
    billing logic directly in the view. Instead, it delegates ledger assembly
    to the billing service layer and then serializes the result for the API
    response.
    """

    def get(self, request, lease_id: int) -> Response:
        """
        Return the lease ledger for the requested lease.

        Args:
            request: DRF request object.
            lease_id: Primary key of the target lease.

        Returns:
            Response: Serialized lease-ledger payload.
        """
        # Step 1: resolve org boundary
        org, err = self._get_org_or_response(request)
        if err:
            return err

        # Step 2: enforce org-safe lease lookup
        lease = get_object_or_404(Lease, id=lease_id, organization=org)

        # Step 3: delegate ledger assembly to the service layer
        ledger_data = LeaseLedgerService.build_lease_ledger(
            organization_id=org.id,
            lease_id=lease.id,
        )

        # Step 4: serialize and return the ledger payload
        response_serializer = LeaseLedgerResponseSerializer(instance=ledger_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)