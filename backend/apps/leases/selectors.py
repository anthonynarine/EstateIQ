# ✅ New Code
from __future__ import annotations

from django.db.models import Prefetch, QuerySet

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


def tenants_qs(*, org: Organization) -> QuerySet[Tenant]:
    """Return org-scoped tenant queryset."""
    return Tenant.objects.filter(organization=org).order_by("-created_at")


def units_qs(*, org: Organization) -> QuerySet[Unit]:
    """Return org-scoped unit queryset (used for validation)."""
    return Unit.objects.filter(organization=org)


def lease_parties_qs(*, org: Organization) -> QuerySet[LeaseTenant]:
    """Return org-scoped lease parties queryset."""
    return LeaseTenant.objects.filter(organization=org).select_related("tenant", "lease")


def leases_qs(*, org: Organization) -> QuerySet[Lease]:
    """Return org-scoped lease queryset with related objects for UI."""
    return (
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related(
            Prefetch("parties", queryset=LeaseTenant.objects.select_related("tenant"))
        )
        .order_by("-created_at")
    )