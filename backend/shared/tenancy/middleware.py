# Filename: backend/shared/tenancy/middleware.py

# Step 1: resolve request.org from a header (MVP-safe)
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.http import HttpRequest

from apps.core.models import Organization


@dataclass(frozen=True)
class OrgResolutionResult:
    """Result of org resolution for the request."""
    organization: Optional[Organization]
    source: str


class OrganizationResolutionMiddleware:
    """
    Resolves the tenant Organization for the current request.

    MVP resolution strategy:
      - Read org slug from the `X-Org-Slug` header.
      - If not present, request.org is None.

    Later (production upgrade):
      - Resolve org from subdomain (e.g., acme.portfolioos.com)
      - Resolve org from JWT claims (org_id) for API-to-API calls
      - Enforce org presence for all /api routes except auth/onboarding
    """

    HEADER_NAME = "HTTP_X_ORG_SLUG"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        # Step 2: resolve org and attach to request
        result = self._resolve_org(request)
        request.org = result.organization
        request.org_resolution_source = result.source

        return self.get_response(request)

    def _resolve_org(self, request: HttpRequest) -> OrgResolutionResult:
        # Step 3: fetch org slug from header
        org_slug = (request.META.get(self.HEADER_NAME) or "").strip()
        if not org_slug:
            return OrgResolutionResult(organization=None, source="missing_header")

        # Step 4: lookup org safely
        org = Organization.objects.filter(slug=org_slug, is_active=True).first()
        if not org:
            return OrgResolutionResult(organization=None, source="org_not_found")

        return OrgResolutionResult(organization=org, source="header")
