# Filename: apps/buildings/selectors.py

from __future__ import annotations

from django.db.models import BooleanField, Case, Exists, OuterRef, Q, QuerySet, Subquery, Value, When
from django.utils import timezone

from apps.buildings.models import Building, Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant
from apps.leases.selectors import active_lease_today_q


def buildings_qs_for_org(*, org: Organization) -> QuerySet[Building]:
    """Return buildings scoped to an organization.

    Args:
        org: Organization that owns the building records.

    Returns:
        QuerySet[Building]: Org-scoped building queryset.
    """
    # Step 1: Enforce tenant isolation at the queryset boundary
    return Building.objects.filter(organization=org).order_by("-created_at", "-id")


def _active_lease_subquery(*, org: Organization, today) -> QuerySet[Lease]:
    """Build the reusable active-lease subquery for a unit row.

    This helper is intentionally kept small so the active-lease definition
    remains centralized and easy to inspect.

    Args:
        org: Organization that owns the lease records.
        today: Local evaluation date.

    Returns:
        QuerySet[Lease]: Subquery-ready lease queryset bound to Unit via OuterRef.
    """
    # Step 1: Return only leases that are active for the current unit row
    return (
        Lease.objects.filter(
            organization=org,
            unit_id=OuterRef("pk"),
            status=Lease.Status.ACTIVE,
            start_date__lte=today,
        )
        .filter(active_lease_today_q(today=today))
        .order_by("-start_date", "-id")
    )


def _active_primary_party_subquery(*, org: Organization, today) -> QuerySet[LeaseTenant]:
    """Build the reusable active-primary-tenant subquery for a unit row.

    This queryset runs against LeaseTenant, not Lease.

    Important:
        The shared `active_lease_today_q()` helper uses unprefixed lease fields
        like `end_date`, so it is valid only for Lease querysets.

        Because this selector runs on LeaseTenant and joins through `lease`,
        we must use the lease-prefixed field paths directly here:
            - lease__end_date__isnull=True
            - lease__end_date__gt=today

    Domain relationship:
        Unit -> Active Lease -> Primary LeaseTenant -> Tenant

    Args:
        org: Organization that owns the lease records.
        today: Local evaluation date.

    Returns:
        QuerySet[LeaseTenant]: Subquery-ready queryset bound to Unit via OuterRef.
    """
    # Step 1: Scope to org + primary-party rows
    # Step 2: Join through lease and apply the SAME active-lease semantics
    #         used elsewhere in the app:
    #             [start_date, end_date)
    # Step 3: Order deterministically so [:1] stays stable
    return (
        LeaseTenant.objects.filter(
            organization=org,
            role=LeaseTenant.Role.PRIMARY,
            lease__organization=org,
            lease__unit_id=OuterRef("pk"),
            lease__status=Lease.Status.ACTIVE,
            lease__start_date__lte=today,
        )
        .filter(
            Q(lease__end_date__isnull=True) | Q(lease__end_date__gt=today)
        )
        .order_by("-lease__start_date", "-lease_id", "-id")
    )


def _annotate_units_with_occupancy(*, org: Organization, qs: QuerySet[Unit]) -> QuerySet[Unit]:
    """Annotate units with a frontend-friendly occupancy read model.

    The frontend unit card needs a compact, deterministic snapshot of:

        - whether the unit is occupied
        - which active lease is driving occupancy
        - who the primary tenant is
        - lightweight contact details for the tenant bio modal
        - whether an active lease exists but the tenant link is incomplete

    This selector keeps that logic in the backend so React does not need to
    reconstruct lease-party business rules on the client.

    Args:
        org: Organization that owns the unit and lease records.
        qs: Base unit queryset, already org-scoped.

    Returns:
        QuerySet[Unit]: Annotated unit queryset suitable for list/detail APIs.
    """
    # Step 1: Resolve the local evaluation date once
    today = timezone.localdate()

    # Step 2: Build reusable subqueries
    active_lease_sq = _active_lease_subquery(org=org, today=today)
    active_primary_party_sq = _active_primary_party_subquery(org=org, today=today)

    # Step 3: Annotate the flat occupancy contract plus a richer tenant summary
    annotated_qs = qs.annotate(
        is_occupied=Exists(active_lease_sq),
        active_lease_id=Subquery(active_lease_sq.values("id")[:1]),
        active_lease_end_date=Subquery(active_lease_sq.values("end_date")[:1]),
        active_tenant_id=Subquery(active_primary_party_sq.values("tenant_id")[:1]),
        active_tenant_name=Subquery(
            active_primary_party_sq.values("tenant__full_name")[:1]
        ),
        active_tenant_email=Subquery(
            active_primary_party_sq.values("tenant__email")[:1]
        ),
        active_tenant_phone=Subquery(
            active_primary_party_sq.values("tenant__phone")[:1]
        ),
    )

    # Step 4: Add a boolean warning flag for "occupied but missing primary tenant"
    return annotated_qs.annotate(
        occupancy_has_data_issue=Case(
            When(
                is_occupied=True,
                active_tenant_id__isnull=True,
                then=Value(True),
            ),
            default=Value(False),
            output_field=BooleanField(),
        )
    )


def units_qs_for_org(*, org: Organization) -> QuerySet[Unit]:
    """Return org-scoped units annotated with occupancy and tenant summary.

    Args:
        org: Organization that owns the unit records.

    Returns:
        QuerySet[Unit]: Unit queryset prepared for workspace list/detail views.
    """
    # Step 1: Start with a lean org-scoped base queryset
    qs = Unit.objects.select_related("building").filter(organization=org)

    # Step 2: Apply the occupancy read-model annotations
    return _annotate_units_with_occupancy(org=org, qs=qs).order_by("id")


def building_units_qs_for_org(*, org: Organization, building_id: int) -> QuerySet[Unit]:
    """Return units for a specific building, annotated with occupancy.

    Args:
        org: Organization that owns the records.
        building_id: Building primary key.

    Returns:
        QuerySet[Unit]: Building-scoped unit queryset with occupancy fields.
    """
    # Step 1: Reuse the canonical unit selector and apply the building filter
    return units_qs_for_org(org=org).filter(building_id=building_id)


def building_units_with_occupancy_qs_for_org(
    *,
    org: Organization,
    building_id: int,
) -> QuerySet[Unit]:
    """Return building units with occupancy annotations.

    This backward-compatible helper exists so older call sites can keep working
    while the app gradually converges on `building_units_qs_for_org()`.

    Args:
        org: Organization that owns the records.
        building_id: Building primary key.

    Returns:
        QuerySet[Unit]: Same output as `building_units_qs_for_org`.
    """
    # Step 1: Keep the compatibility wrapper thin and deterministic
    return building_units_qs_for_org(org=org, building_id=building_id)