# Filename: backend/apps/core/api/views.py

# Step 1: core API views
from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Organization, OrganizationMember
from shared.auth.permissions import IsOrgMember


# ✅ New Code
def _generate_unique_org_slug(name: str) -> str:
    """Generate a unique, URL-safe slug for an Organization.

    This keeps slug logic server-side so the frontend only needs to send a name.

    Args:
        name: Organization display name.

    Returns:
        A unique slug string suitable for URLs.
    """
    # Step 1: normalize into a base slug
    base = slugify(name)[:50] or "org"

    # Step 2: if unused, return immediately
    if not Organization.objects.filter(slug=base).exists():
        return base

    # Step 3: add numeric suffix until unique
    i = 2
    while True:
        candidate = f"{base}-{i}"
        if not Organization.objects.filter(slug=candidate).exists():
            return candidate
        i += 1


class WhoAmIView(APIView):
    """Returns the current user + resolved org (proves tenancy wiring)."""

    permission_classes = [IsOrgMember]

    def get(self, request):
        org = request.org
        return Response(
            {
                "user": {
                    "id": request.user.id,
                    "username": request.user.get_username(),
                    "email": request.user.email,
                },
                "organization": {
                    "id": org.id,
                    "slug": org.slug,
                    "name": org.name,
                },
                "org_resolution_source": getattr(request, "org_resolution_source", None),
            }
        )


class OrganizationListCreateView(APIView):
    """Org bootstrap endpoint (ORGLESS).

    - Requires authentication (Bearer token).
    - MUST NOT require X-Org-Slug.
    - GET: list orgs the user belongs to
    - POST: create org + auto-create membership for creator

    Payload:
        { "name": "Acme Holdings" }
        Optional: { "slug": "acme-holdings" } (server will generate if omitted)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Step 1: list orgs for current user
        org_ids = OrganizationMember.objects.filter(user=request.user).values_list(
            "organization_id", flat=True
        )

        orgs = Organization.objects.filter(id__in=org_ids, is_active=True).order_by("name")

        return Response(
            [
                {
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug,
                    "is_active": org.is_active,
                    "default_timezone": getattr(org, "default_timezone", None),
                    "currency": getattr(org, "currency", None),
                }
                for org in orgs
            ],
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def post(self, request):
        # Step 1: validate payload
        name = (request.data.get("name") or "").strip()
        slug = (request.data.get("slug") or "").strip()

        if not name:
            return Response(
                {"detail": "name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ New Code: slug is optional; generate a unique one if missing
        if not slug:
            slug = _generate_unique_org_slug(name)

        # Step 2: create org
        org = Organization.objects.create(name=name, slug=slug)

        # Step 3: create membership for creator
        # NOTE: Adjust role value if your model uses different choices.
        OrganizationMember.objects.get_or_create(
            organization=org,
            user=request.user,
            defaults={"role": getattr(OrganizationMember, "ROLE_OWNER", "owner")},
        )

        return Response(
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "is_active": org.is_active,
            },
            status=status.HTTP_201_CREATED,
        )