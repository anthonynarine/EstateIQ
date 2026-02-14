# # Filename: backend/apps/users/views.py
from __future__ import annotations

import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MeSerializer, RegisterSerializer

logger = logging.getLogger("apps.users")


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Creates a new user account.

    Security:
        - Never log request body or password.
        - Log minimal event metadata (email, outcome).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Step 1: Validate input
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            email = (request.data.get("email") or "").strip().lower()
            logger.warning(
                "auth.register.failed_validation",
                extra={
                    "email": email,
                    "ip": request.META.get("REMOTE_ADDR"),
                },
            )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Step 2: Create user
        user = serializer.save()

        # Step 3: Log successful registration
        logger.info(
            "auth.register.success",
            extra={
                "user_id": user.id,
                "email": user.email,
                "ip": request.META.get("REMOTE_ADDR"),
            },
        )

        # Step 4: Return minimal identity
        return Response(
            {"id": user.id, "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class AuthMeView(APIView):
    """
    GET /api/v1/auth/me/

    Returns the authenticated user's profile and org memberships.

    Security:
        - Block suspended accounts (403).
        - Log suspended access attempts.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Step 1: Enforce account status
        user = request.user
        if getattr(user, "is_suspended", False):
            logger.warning(
                "auth.me.blocked_suspended",
                extra={
                    "user_id": getattr(user, "id", None),
                    "email": getattr(user, "email", None),
                    "ip": request.META.get("REMOTE_ADDR"),
                },
            )
            return Response({"detail": "Account is suspended."}, status=status.HTTP_403_FORBIDDEN)

        # Step 2: Log access (low volume, safe)
        logger.info(
            "auth.me.success",
            extra={
                "user_id": user.id,
                "email": user.email,
            },
        )

        # Step 3: Serialize user
        data = MeSerializer(user).data
        return Response(data, status=status.HTTP_200_OK)


# Re-export these for clean URL wiring
class TokenPairView(TokenObtainPairView):
    """
    POST /api/v1/auth/token/

    Note:
        SimpleJWT handles auth internally; we still want a log marker
        without leaking credentials or tokens.
    """

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()
        logger.info(
            "auth.token.attempt",
            extra={"email": email, "ip": request.META.get("REMOTE_ADDR")},
        )

        response = super().post(request, *args, **kwargs)

        # Step 1: Log outcome only
        if response.status_code == 200:
            logger.info("auth.token.success", extra={"email": email})
        else:
            logger.warning("auth.token.failed", extra={"email": email, "status": response.status_code})

        return response


class TokenRefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/token/refresh/

    Security:
        - Do not log refresh tokens.
        - Log attempt + outcome only.
    """

    def post(self, request, *args, **kwargs):
        logger.info(
            "auth.refresh.attempt",
            extra={"ip": request.META.get("REMOTE_ADDR")},
        )

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            logger.info("auth.refresh.success")
        else:
            logger.warning("auth.refresh.failed", extra={"status": response.status_code})

        return response
