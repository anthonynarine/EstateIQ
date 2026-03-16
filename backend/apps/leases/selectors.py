# Filename: apps/leases/selectors.py

from __future__ import annotations

from datetime import date
from typing import Optional

from django.db.models import Prefetch, Q, QuerySet
from django.utils import timezone

from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


def normalize_tenant_directory_search(search: Optional[str]) -> str:
    """Normalize free-text tenant directory search input.

    Args:
        search: Raw search string from the request.

    Returns:
        str: Trimmed search string with repeated whitespace collapsed.
    """
    # Step 1: Guard empty values
    if not search:
        return ""

    # Step 2: Collapse repeated whitespace and trim edges
    return " ".join(search.split())


def apply_tenant_directory_search(
    *,
    qs: QuerySet[Tenant],
    search: Optional[str],
) -> QuerySet[Tenant]:
    """Apply production-safe tenant directory search filters.

    Search contract for now:
    - full_name
    - email
    - phone

    Matching behavior:
    - case-insensitive
    - repeated whitespace normalized
    - multiple search terms are AND-ed together
    - each term may match any supported field

    Examples:
        "anthony" -> matches full_name/email/phone containing "anthony"
        "anthony 555" -> must match both terms across supported fields

    Args:
        qs: Base org-scoped tenant queryset.
        search: Raw search string from request query params.

    Returns:
        QuerySet[Tenant]: Filtered queryset when search is present,
        otherwise the original queryset.
    """
    # Step 1: Normalize incoming search text
    normalized_search = normalize_tenant_directory_search(search)

    # Step 2: Return the original queryset when search is empty
    if not normalized_search:
        return qs

    # Step 3: Split into terms for more robust matching
    terms = normalized_search.split(" ")

    # Step 4: Require every term to match at least one supported field
    filtered_qs = qs
    for term in terms:
        filtered_qs = filtered_qs.filter(
            Q(full_name__icontains=term)
            | Q(email__icontains=term)
            | Q(phone__icontains=term)
        )

    return filtered_qs


def tenants_qs(
    *,
    org: Organization,
    search: Optional[str] = None,
) -> QuerySet[Tenant]:
    """Return the canonical org-scoped tenant queryset for read APIs.

    This selector prepares the relationship graph needed for tenant
    directory/detail read models without storing residency history directly
    on the Tenant model.

    Derived fields supported by this queryset:
        - active_lease
        - occupancy_status
        - current_residence
        - lease_history

    Args:
        org: Organization that owns the tenant records.
        search: Optional free-text tenant directory search query.

    Returns:
        QuerySet[Tenant]: Org-scoped tenant queryset with optional search,
        lease links, leases, units, and buildings prefetched.
    """
    # Step 1: Prefetch tenant-to-lease links with the full lease chain
    lease_links_prefetch = Prefetch(
        "lease_links",
        queryset=(
            LeaseTenant.objects.filter(organization=org)
            .select_related(
                "tenant",
                "lease",
                "lease__unit",
                "lease__unit__building",
            )
            .order_by(
                "-lease__start_date",
                "-lease__id",
                "role",
                "id",
            )
        ),
        to_attr="prefetched_lease_links",
    )

    # Step 2: Start with the org-scoped tenant base queryset
    qs = Tenant.objects.filter(organization=org)

    # Step 3: Apply search before prefetch/pagination
    qs = apply_tenant_directory_search(qs=qs, search=search)

    # Step 4: Attach relationship graph and return stable ordering
    return qs.prefetch_related(lease_links_prefetch).order_by("full_name", "id")


def tenant_detail_qs(*, org: Organization) -> QuerySet[Tenant]:
    """Return the tenant detail queryset.

    This currently reuses the canonical tenant selector. It exists as a
    separate function so detail-specific prefetching can be expanded later
    without changing list-query behavior.

    Args:
        org: Organization that owns the tenant records.

    Returns:
        QuerySet[Tenant]: Org-scoped tenant queryset for detail views.
    """
    # Step 1: Reuse the canonical tenant selector without list search filters
    return tenants_qs(org=org)


def leases_qs(*, org: Organization) -> QuerySet[Lease]:
    """Return the canonical org-scoped lease queryset.

    Includes:
        - unit + building via select_related
        - lease parties + tenant via prefetch_related

    Args:
        org: Organization that owns the lease records.

    Returns:
        QuerySet[Lease]: Stable, org-scoped queryset for lease reads.
    """
    # Step 1: Prefetch lease parties with tenant records for rich read APIs
    parties_prefetch = Prefetch(
        "parties",
        queryset=LeaseTenant.objects.select_related("tenant").order_by("role", "id"),
    )

    # Step 2: Return the canonical lease queryset
    return (
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related(parties_prefetch)
        .order_by("-created_at", "-id")
    )


def leases_for_unit_qs(*, org: Organization, unit_id: int) -> QuerySet[Lease]:
    """Return all leases for a single unit, scoped to an organization.

    Args:
        org: Organization that owns the records.
        unit_id: Unit primary key.

    Returns:
        QuerySet[Lease]: Org-scoped lease history for the unit.
    """
    # Step 1: Reuse the canonical selector and apply the unit filter
    return leases_qs(org=org).filter(unit_id=unit_id)


def leases_for_building_qs(*, org: Organization, building_id: int) -> QuerySet[Lease]:
    """Return all leases for a single building, scoped to an organization.

    Args:
        org: Organization that owns the records.
        building_id: Building primary key.

    Returns:
        QuerySet[Lease]: Org-scoped leases for units in the building.
    """
    # Step 1: Reuse the canonical selector and apply the building filter
    return leases_qs(org=org).filter(unit__building_id=building_id)


def active_lease_today_q(*, today: date) -> Q:
    """Return the shared active-lease predicate for a specific date.

    Lease interval semantics in this codebase should be treated as:

        [start_date, end_date)

    That means:
        - start_date is inclusive
        - end_date is exclusive
        - a lease ending on `today` is no longer active on `today`
        - an open-ended lease (end_date is null) remains active

    This matches the current building occupancy logic and prevents subtle
    disagreement between building summary counts and unit-level occupancy.

    Args:
        today: The date for which we want to evaluate lease activity.

    Returns:
        Q: Predicate representing "lease is active on today".
    """
    # Step 1: Open-ended leases are active
    # Step 2: Otherwise the lease must end after today (end-exclusive)
    return Q(end_date__isnull=True) | Q(end_date__gt=today)


def active_leases_today_qs(
    *,
    org: Organization,
    today: Optional[date] = None,
) -> QuerySet[Lease]:
    """Return ACTIVE leases that are active on the given date.

    Args:
        org: Organization that owns the records.
        today: Optional evaluation date. Defaults to the local current date.

    Returns:
        QuerySet[Lease]: Org-scoped leases active on the target date.
    """
    # Step 1: Resolve the evaluation date
    resolved_today = today or timezone.localdate()

    # Step 2: Apply the shared active predicate
    return (
        leases_qs(org=org)
        .filter(
            status=Lease.Status.ACTIVE,
            start_date__lte=resolved_today,
        )
        .filter(active_lease_today_q(today=resolved_today))
    )