# Filename: backend/apps/billing/views/mixins.py

"""
Shared view mixins and base classes for the billing domain.

This module contains reusable endpoint infrastructure for billing views.

Why this file exists:
- Keeps tenancy enforcement logic out of individual endpoint classes.
- Gives the billing app a single, consistent base for org-scoped API views.
- Prevents copy-paste org resolution code across multiple billing endpoints.

Design note:
Billing endpoints are multi-tenant and financially sensitive. Requests must
never reach service-layer logic without a resolved organization boundary.
This base class enforces that rule at the view layer.
"""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.auth.permissions import IsOrgMember


class OrgScopedAPIView(APIView):
    """
    Base class for organization-scoped billing endpoints.

    This class enforces tenant resolution at the view boundary so orgless
    requests are rejected before reaching billing services.

    Permission model:
        - Requires the authenticated user to be an organization member.
        - Requires request.org to be resolved by upstream middleware.

    Notes:
        The current project resolves the active organization from the
        `X-Org-Slug` header via middleware. If that resolution fails, billing
        endpoints should return a client error rather than falling through into
        service code and raising avoidable server errors.
    """

    permission_classes = [IsOrgMember]

    def _get_org_or_response(
        self,
        request: Any,
    ) -> tuple[object | None, Response | None]:
        """
        Return the resolved organization or an error response.

        Args:
            request: DRF request object.

        Returns:
            tuple[object | None, Response | None]:
                A tuple of (organization, error_response). Exactly one of these
                values will be non-null.

        Behavior:
            - Returns the resolved organization when `request.org` exists.
            - Returns a 400 response when the org header/middleware resolution
              is missing.
        """
        # Step 1: read the middleware-resolved organization from the request
        org = getattr(request, "org", None)

        # Step 2: fail fast if the org boundary is missing
        if org is None:
            return (
                None,
                Response(
                    {"detail": "X-Org-Slug header is required for this endpoint."},
                    status=status.HTTP_400_BAD_REQUEST,
                ),
            )

        # Step 3: return the resolved organization
        return org, None