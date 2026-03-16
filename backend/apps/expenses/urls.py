
"""
URL routing for the expenses domain.

This module registers all expenses-related viewsets with a DRF router so the
domain can be mounted cleanly into the main API URL configuration.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.expenses.views import (
    ExpenseCategoryViewSet,
    ExpenseViewSet,
    VendorViewSet,
)

app_name = "expenses"

router = DefaultRouter()

# Step 1: Register expense endpoints.
router.register(
    r"expenses",
    ExpenseViewSet,
    basename="expense",
)

# Step 2: Register expense category endpoints.
router.register(
    r"expense-categories",
    ExpenseCategoryViewSet,
    basename="expense-category",
)

# Step 3: Register vendor endpoints.
router.register(
    r"vendors",
    VendorViewSet,
    basename="vendor",
)

urlpatterns = [
    # Step 4: Expose router-generated API routes for this domain.
    path("", include(router.urls)),
]