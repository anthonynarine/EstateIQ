# Filename: backend/shared/tenancy/middleware.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.http import HttpRequest

from apps.core.models import Organization, OrganizationMember


@dataclass(frozen=True)
class OrgResolutionResult:
    """Resolved tenant context for the current request."""

    organization: Optional[Organization]
    membership: Optional[OrganizationMember]
    source: str
    requested_slug: str


class OrganizationResolutionMiddleware:
    """
    Resolve organization + membership context for the current request.

    Behavior:
      - Read org slug from X-Org-Slug.
      - Resolve active Organization.
      - If authenticated, resolve active OrganizationMember.
      - Attach both legacy and canonical request attributes.

    Notes:
      - Keeps `request.org` for backward compatibility.
      - Adds `request.organization` for clearer newer code.
      - Adds `request.org_member` for downstream permission checks.
      - Does not enforce route-level role permissions here.
    """

    HEADER_NAME = "HTTP_X_ORG_SLUG"

    def __init__(self, get_response):
        """Store downstream callable."""
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        """
        Resolve tenant context and attach it to the request.

        Args:
            request: Incoming Django request.

        Returns:
            Django response from downstream middleware/view.
        """
        # Step 1: Resolve org + membership once for the request lifecycle.
        result = self._resolve_context(request)

        # Step 2: Preserve existing request contract.
        request.org = result.organization

        # Step 3: Add canonical request contract for newer domains.
        request.organization = result.organization

        # Step 4: Attach resolved membership for downstream permissions.
        request.org_member = result.membership

        # Step 5: Attach debug/observability metadata.
        request.org_resolution_source = result.source
        request.requested_org_slug = result.requested_slug

        return self.get_response(request)

    def _resolve_context(self, request: HttpRequest) -> OrgResolutionResult:
        """
        Resolve organization and active membership for this request.

        Args:
            request: Incoming Django request.

        Returns:
            OrgResolutionResult containing org, membership, and metadata.
        """
        # Step 1: Extract and normalize org slug.
        org_slug = self._extract_org_slug(request)
        if not org_slug:
            return OrgResolutionResult(
                organization=None,
                membership=None,
                source="missing_header",
                requested_slug="",
            )

        # Step 2: Resolve active organization.
        organization = (
            Organization.objects.filter(slug=org_slug, is_active=True)
            .only("id", "slug", "name", "is_active")
            .first()
        )
        if organization is None:
            return OrgResolutionResult(
                organization=None,
                membership=None,
                source="org_not_found",
                requested_slug=org_slug,
            )

        # Step 3: Resolve active membership only for authenticated users.
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return OrgResolutionResult(
                organization=organization,
                membership=None,
                source="header_org_only",
                requested_slug=org_slug,
            )

        membership = (
            OrganizationMember.objects.select_related("organization", "user")
            .filter(
                organization=organization,
                user=user,
                is_active=True,
                status=OrganizationMember.Status.ACTIVE,
            )
            .first()
        )

        if membership is None:
            return OrgResolutionResult(
                organization=None,
                membership=None,
                source="membership_not_found",
                requested_slug=org_slug,
            )

        return OrgResolutionResult(
            organization=organization,
            membership=membership,
            source="header_membership",
            requested_slug=org_slug,
        )

    def _extract_org_slug(self, request: HttpRequest) -> str:
        """
        Extract normalized org slug from request headers.

        Args:
            request: Incoming Django request.

        Returns:
            Normalized org slug or empty string.
        """
        # Step 1: Prefer META access for middleware-level header lookup.
        raw_slug = request.META.get(self.HEADER_NAME)

        # Step 2: Fallback to request.headers for resilience.
        if raw_slug is None:
            raw_slug = request.headers.get("X-Org-Slug")

        # Step 3: Normalize for stable comparison.
        return (raw_slug or "").strip().lower()