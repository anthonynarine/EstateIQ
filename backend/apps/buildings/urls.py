# Filename: apps/buildings/urls.py
from __future__ import annotations

from rest_framework.routers import DefaultRouter

from apps.buildings.views import BuildingViewSet, UnitViewSet

router = DefaultRouter()
router.register(r"buildings", BuildingViewSet, basename="buildings")
router.register(r"units", UnitViewSet, basename="units")

urlpatterns = router.urls
