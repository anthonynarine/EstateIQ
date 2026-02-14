# Filename: backend/shared/auth/permissions.py
# Step 1: DRF permissions for org membership + roles
from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.core.models import OrganizationMember


class IsOrgMember(BasePermission):
    """
    Requires the request to resolve an organization AND the user to be an active member.

    Uses `request.org` set by OrganizationResolutionMiddleware.
    """

    message = "You must be an active member of this organization."

    def has_permission(self, request, view) -> bool:
        # Step 2: org must be resolved
        org = getattr(request, "org", None)
        if org is None:
            return False

        # Step 3: user must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Step 4: membership must exist
        return OrganizationMember.objects.filter(
            organization=org,
            user=request.user,
            is_active=True,
            status=OrganizationMember.Status.ACTIVE,
        ).exists()
