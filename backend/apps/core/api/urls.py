# Filename: backend/apps/core/api/urls.py


# Step 1: core API routes
from django.urls import path

from .views import WhoAmIView

urlpatterns = [
    path("whoami/", WhoAmIView.as_view(), name="whoami"),
]
