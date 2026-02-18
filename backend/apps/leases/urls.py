# Filename: backend/apps/leases/urls.py
from rest_framework.routers import DefaultRouter

from apps.leases.views import LeaseViewSet, TenantViewSet

router = DefaultRouter()
router.register(r"tenants", TenantViewSet, basename="tenant")
router.register(r"leases", LeaseViewSet, basename="lease")

urlpatterns = router.urls
