# Filename: backend/apps/core/api/views.py


# Step 1: core API views
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.auth.permissions import IsOrgMember


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
