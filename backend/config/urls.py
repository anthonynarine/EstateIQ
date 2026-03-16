# ✅ New Code
"""
Root URL configuration for the EstateIQ backend.

This module mounts all top-level domain routers under the versioned API
namespace.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Step 1: Django admin routes.
    path("admin/", admin.site.urls),

    # Step 2: Authentication and core platform routes.
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/core/", include("apps.core.api.urls")),
    path("api/v1/orgs/", include("apps.core.api.org_urls")),

    # Step 3: Domain routes.
    path("api/v1/", include("apps.buildings.urls")),
    path("api/v1/", include("apps.leases.urls")),
    path("api/v1/", include("apps.billing.urls")),
    path("api/v1/", include("apps.expenses.urls")),
]