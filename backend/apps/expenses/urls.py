
"""
URL routing for the expenses domain.

This module registers all expenses-related viewsets with a DRF router so the
domain can be mounted cleanly into the main API URL configuration.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.expenses.views import (
    ExpenseCategoryViewSet,
    ExpenseReportingViewSet,
    ExpenseViewSet,
    VendorViewSet,
)

app_name = "expenses"

router = DefaultRouter()

router.register(
    r"expenses",
    ExpenseViewSet,
    basename="expense",
)

router.register(
    r"expense-categories",
    ExpenseCategoryViewSet,
    basename="expense-category",
)

router.register(
    r"vendors",
    VendorViewSet,
    basename="vendor",
)

router.register(
    r"expense-reporting",
    ExpenseReportingViewSet,
    basename="expense-reporting",
)

urlpatterns = [
    path("", include(router.urls)),
]