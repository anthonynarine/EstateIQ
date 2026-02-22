from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/core/", include("apps.core.api.urls")),
    path("api/v1/orgs/", include("apps.core.api.org_urls")),
    path("api/v1/", include("apps.buildings.urls")),
    path("api/v1/", include("apps.leases.urls")), 
    path("api/v1/", include("apps.billing.urls")),
]