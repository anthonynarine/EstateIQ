# # Filename: backend/apps/users/urls.py
from django.urls import path

from .views import AuthMeView, RegisterView, TokenPairView, TokenRefreshView

app_name = "users"

urlpatterns = [
    # Step 1: Registration
    path("register/", RegisterView.as_view(), name="register"),
    # Step 2: JWT endpoints
    path("token/", TokenPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Step 3: Identity endpoint
    path("me/", AuthMeView.as_view(), name="auth_me"),
]
