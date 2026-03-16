# Filename: backend/apps/leases/audit/tenant_residency.py

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Any, Optional

from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.core.models import Organization
from apps.leases.audit.history_integrity import AuditIssue, AuditReport
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class TenantLeaseHistoryRow:
    """Represents one tenant-linked lease row for inspection/debug output.

    Attributes:
        lease_tenant_id: Join-row ID connecting the tenant to the lease.
        lease_id: Lease ID.
        role: Tenant role on the lease.
        lease_status: Stored lease status.
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None.
        is_active_today: Whether the lease is active today under audit semantics.
        unit_id: Related unit ID if available.
        unit_label: Related unit label if available.
        building_id: Related building ID if available.
        building_name: Related building display value if available.
    """

    lease_tenant_id: int
    lease_id: int
    role: str
    lease_status: str
    start_date: str
    end_date: Optional[str]
    is_active_today: bool
    unit_id: Optional[int]
    unit_label: Optional[str]
    building_id: Optional[int]
    building_name: Optional[str]

    def to_dict(self) -> dict[str, Any]:
        """Return the history row as a serializable dictionary.

        Returns:
            dict[str, Any]: Plain dictionary form.
        """
        # Step 1: Convert dataclass fields to a plain dictionary
        return asdict(self)


@dataclass(frozen=True)
class TenantHistoryInspection:
    """Represents a single-tenant debugging report.

    Attributes:
        evaluated_on: Date used for active-lease evaluation.
        org_id: Organization scope.
        tenant_id: Tenant being inspected.
        tenant_name: Tenant display name.
        tenant_email: Optional tenant email.
        tenant_phone: Optional tenant phone.
        derived_status: Derived residency status for the tenant.
        active_lease_id: Active lease ID if exactly one active lease resolves.
        active_lease_unit_label: Active unit label if available.
        active_lease_building_name: Active building display value if available.
        lease_history: Tenant-linked lease rows in reverse chronological order.
        issues: Tenant-specific audit findings.
    """

    evaluated_on: date
    org_id: int
    tenant_id: int
    tenant_name: str
    tenant_email: Optional[str]
    tenant_phone: Optional[str]
    derived_status: str
    active_lease_id: Optional[int]
    active_lease_unit_label: Optional[str]
    active_lease_building_name: Optional[str]
    lease_history: list[TenantLeaseHistoryRow]
    issues: list[AuditIssue]

    def to_dict(self) -> dict[str, Any]:
        """Return the inspection payload as a serializable dictionary.

        Returns:
            dict[str, Any]: Plain dictionary representation.
        """
        # Step 1: Build a fully serializable inspection payload
        return {
            "evaluated_on": str(self.evaluated_on),
            "org_id": self.org_id,
            "tenant_id": self.tenant_id,
            "tenant_name": self.tenant_name,
            "tenant_email": self.tenant_email,
            "tenant_phone": self.tenant_phone,
            "derived_status": self.derived_status,
            "active_lease_id": self.active_lease_id,
            "active_lease_unit_label": self.active_lease_unit_label,
            "active_lease_building_name": self.active_lease_building_name,
            "lease_history": [row.to_dict() for row in self.lease_history],
            "issues": [issue.to_dict() for issue in self.issues],
        }


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease interval is active on the given day.

    Lease intervals are treated as:

        [start_date, end_date)

    Args:
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None for open-ended leases.
        day: Date to evaluate.

    Returns:
        bool: True if the interval is active on the given day.
    """
    # Step 1: A lease cannot be active before it starts
    if start_date > day:
        return False

    # Step 2: Open-ended leases remain active after start_date
    if end_date is None:
        return True

    # Step 3: End date is exclusive
    return end_date > day


def _intervals_overlap_end_exclusive(
    *,
    first_start: date,
    first_end: Optional[date],
    second_start: date,
    second_end: Optional[date],
) -> bool:
    """Return whether two intervals overlap using [start, end) semantics.

    Args:
        first_start: First interval inclusive start date.
        first_end: First interval exclusive end date, or None.
        second_start: Second interval inclusive start date.
        second_end: Second interval exclusive end date, or None.

    Returns:
        bool: True when the intervals overlap.
    """
    # Step 1: Compare the second start against the first end
    left = True if first_end is None else second_start < first_end

    # Step 2: Compare the second end against the first start
    right = True if second_end is None else second_end > first_start

    # Step 3: Intervals overlap only when both sides hold
    return left and right


def audit_tenant_residency_integrity(
    *,
    org_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    only_active: bool = False,
    today: Optional[date] = None,
) -> AuditReport:
    """Run a read-only tenant residency integrity audit.

    This audit is production-safe and does not mutate data.

    The audit validates whether tenant residency truth can be reliably
    derived from:

        Tenant -> LeaseTenant -> Lease -> Unit -> Building

    Args:
        org_id: Optional organization ID to scope the audit.
        tenant_id: Optional tenant ID to narrow the scan further.
        only_active: Whether to inspect only tenants with an active lease today.
        today: Optional evaluation date. Defaults to local date.

    Returns:
        AuditReport: Structured report containing tenant-residency findings.
    """
    # Step 1: Resolve the evaluation date once
    evaluated_on = today or timezone.localdate()

    # Step 2: Resolve which organizations should be audited
    organizations_qs: QuerySet[Organization] = Organization.objects.all().order_by("id")
    if org_id is not None:
        organizations_qs = organizations_qs.filter(id=org_id)

    organizations = list(organizations_qs)

    report = AuditReport(
        evaluated_on=evaluated_on,
        org_ids=[organization.id for organization in organizations],
    )

    # Step 3: Audit each organization independently
    for organization in organizations:
        report.issues.extend(
            _audit_single_organization(
                org=organization,
                today=evaluated_on,
                tenant_id=tenant_id,
                only_active=only_active,
            )
        )

    return report


def inspect_tenant_history(
    *,
    org_id: int,
    tenant_id: int,
    today: Optional[date] = None,
) -> TenantHistoryInspection:
    """Inspect one tenant and return a structured debugging snapshot.

    Args:
        org_id: Organization ID that owns the tenant.
        tenant_id: Tenant ID to inspect.
        today: Optional evaluation date. Defaults to local date.

    Returns:
        TenantHistoryInspection: Structured tenant history and anomaly output.

    Raises:
        Tenant.DoesNotExist: If the tenant is not found in the given org.
    """
    # Step 1: Resolve the evaluation date once
    evaluated_on = today or timezone.localdate()

    # Step 2: Load the tenant with the same relationship graph used by the audit
    tenant = _tenant_base_queryset(org_id=org_id).get(id=tenant_id)

    # Step 3: Resolve linked lease rows and current activity
    lease_links = list(getattr(tenant, "prefetched_lease_links", []))
    active_links = _get_active_lease_links(lease_links=lease_links, today=evaluated_on)
    issues = _audit_single_tenant(
        org_id=org_id,
        tenant=tenant,
        lease_links=lease_links,
        today=evaluated_on,
    )

    # Step 4: Build lease-history rows for readable inspection output
    history_rows = [
        _build_history_row(lease_link=lease_link, today=evaluated_on)
        for lease_link in lease_links
    ]

    # Step 5: Derive current status and active residence summary
    derived_status = "active" if active_links else "former"

    active_lease_id: Optional[int] = None
    active_lease_unit_label: Optional[str] = None
    active_lease_building_name: Optional[str] = None

    if len(active_links) == 1:
        active_lease = active_links[0].lease
        active_lease_id = active_lease.id
        active_lease_unit_label = _get_unit_label(getattr(active_lease, "unit", None))
        active_lease_building_name = _get_building_display_name(active_lease)

    return TenantHistoryInspection(
        evaluated_on=evaluated_on,
        org_id=org_id,
        tenant_id=tenant.id,
        tenant_name=tenant.full_name,
        tenant_email=tenant.email,
        tenant_phone=tenant.phone,
        derived_status=derived_status,
        active_lease_id=active_lease_id,
        active_lease_unit_label=active_lease_unit_label,
        active_lease_building_name=active_lease_building_name,
        lease_history=history_rows,
        issues=issues,
    )


def _tenant_base_queryset(*, org_id: int) -> QuerySet[Tenant]:
    """Return the canonical org-scoped tenant queryset for audit work.

    Args:
        org_id: Organization ID that owns the tenant graph.

    Returns:
        QuerySet[Tenant]: Prefetched tenant queryset with full lease chain.
    """
    # Step 1: Prefetch related lease parties so active-primary checks stay cheap
    lease_parties_prefetch = Prefetch(
        "lease__parties",
        queryset=LeaseTenant.objects.select_related("tenant").order_by("id"),
    )

    # Step 2: Prefetch the tenant-to-lease graph needed for deterministic audit work
    lease_links_prefetch = Prefetch(
        "lease_links",
        queryset=(
            LeaseTenant.objects.filter(organization_id=org_id)
            .select_related(
                "tenant",
                "lease",
                "lease__unit",
                "lease__unit__building",
            )
            .prefetch_related(lease_parties_prefetch)
            .order_by(
                "-lease__start_date",
                "-lease__id",
                "role",
                "id",
            )
        ),
        to_attr="prefetched_lease_links",
    )

    # Step 3: Return the org-scoped tenant queryset
    return (
        Tenant.objects.filter(organization_id=org_id)
        .prefetch_related(lease_links_prefetch)
        .order_by("full_name", "id")
    )


def _audit_single_organization(
    *,
    org: Organization,
    today: date,
    tenant_id: Optional[int],
    only_active: bool,
) -> list[AuditIssue]:
    """Audit tenant residency integrity for one organization.

    Args:
        org: Organization being audited.
        today: Evaluation date for active residency truth.
        tenant_id: Optional tenant ID filter.
        only_active: Whether to scan only currently active tenants.

    Returns:
        list[AuditIssue]: Tenant-residency findings for the organization.
    """
    # Step 1: Load tenant graph once for the whole organization
    tenants = list(_tenant_base_queryset(org_id=org.id))

    # Step 2: Apply optional tenant filter
    if tenant_id is not None:
        tenants = [tenant for tenant in tenants if tenant.id == tenant_id]

    # Step 3: Apply optional active-only filter
    if only_active:
        tenants = [
            tenant
            for tenant in tenants
            if _get_active_lease_links(
                lease_links=list(getattr(tenant, "prefetched_lease_links", [])),
                today=today,
            )
        ]

    issues: list[AuditIssue] = []

    # Step 4: Audit each tenant independently
    for tenant in tenants:
        issues.extend(
            _audit_single_tenant(
                org_id=org.id,
                tenant=tenant,
                lease_links=list(getattr(tenant, "prefetched_lease_links", [])),
                today=today,
            )
        )

    return issues


def _audit_single_tenant(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[AuditIssue]:
    """Run tenant-centric residency checks for one tenant.

    Args:
        org_id: Organization scope for the audit.
        tenant: Tenant being audited.
        lease_links: Prefetched LeaseTenant rows for the tenant.
        today: Evaluation date for active truth.

    Returns:
        list[AuditIssue]: Findings for the tenant.
    """
    issues: list[AuditIssue] = []

    # Step 1: Run tenant-level checks in a deterministic order
    issues.extend(
        _check_cross_org_integrity(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
        )
    )
    issues.extend(
        _check_duplicate_relationship_rows(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
        )
    )
    issues.extend(
        _check_status_date_drift(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
            today=today,
        )
    )
    issues.extend(
        _check_active_lease_integrity(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
            today=today,
        )
    )
    issues.extend(
        _check_overlap_integrity(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
            today=today,
        )
    )
    issues.extend(
        _check_history_chain_integrity(
            org_id=org_id,
            tenant=tenant,
            lease_links=lease_links,
            today=today,
        )
    )

    return issues


def _get_active_lease_links(
    *,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[LeaseTenant]:
    """Return the tenant's active LeaseTenant rows for the given date.

    Active means:
        - lease.status == ACTIVE
        - start_date <= today
        - end_date is None or end_date > today

    Args:
        lease_links: Tenant-linked LeaseTenant rows.
        today: Evaluation date.

    Returns:
        list[LeaseTenant]: Active links ordered like the prefetched input.
    """
    # Step 1: Filter linked leases using the shared active-truth semantics
    return [
        lease_link
        for lease_link in lease_links
        if lease_link.lease.status == Lease.Status.ACTIVE
        and _is_active_on_day(
            start_date=lease_link.lease.start_date,
            end_date=lease_link.lease.end_date,
            day=today,
        )
    ]


def _check_cross_org_integrity(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
) -> list[AuditIssue]:
    """Check cross-organization mismatches through the tenant residency chain.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.

    Returns:
        list[AuditIssue]: Cross-org integrity findings.
    """
    issues: list[AuditIssue] = []

    # Step 1: Validate the tenant itself is inside the requested org scope
    if tenant.organization_id != org_id:
        issues.append(
            AuditIssue(
                code="tenant_org_scope_mismatch",
                severity="high",
                org_id=org_id,
                message="Tenant does not belong to the organization being audited.",
                payload={
                    "tenant_id": tenant.id,
                    "tenant_org_id": tenant.organization_id,
                    "audit_org_id": org_id,
                },
            )
        )

    # Step 2: Validate each link and its lease chain
    for lease_link in lease_links:
        if lease_link.organization_id != org_id:
            issues.append(
                AuditIssue(
                    code="tenant_link_org_mismatch",
                    severity="high",
                    org_id=org_id,
                    message="LeaseTenant row belongs to a different organization than the tenant audit scope.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_tenant_id": lease_link.id,
                        "link_org_id": lease_link.organization_id,
                        "audit_org_id": org_id,
                    },
                )
            )

        if lease_link.tenant.organization_id != org_id:
            issues.append(
                AuditIssue(
                    code="tenant_link_tenant_org_mismatch",
                    severity="high",
                    org_id=org_id,
                    message="LeaseTenant row points to a tenant in another organization.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_tenant_id": lease_link.id,
                        "linked_tenant_id": lease_link.tenant_id,
                        "linked_tenant_org_id": lease_link.tenant.organization_id,
                        "audit_org_id": org_id,
                    },
                )
            )

        if lease_link.lease.organization_id != org_id:
            issues.append(
                AuditIssue(
                    code="tenant_link_lease_org_mismatch",
                    severity="high",
                    org_id=org_id,
                    message="LeaseTenant row points to a lease in another organization.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_tenant_id": lease_link.id,
                        "lease_id": lease_link.lease_id,
                        "lease_org_id": lease_link.lease.organization_id,
                        "audit_org_id": org_id,
                    },
                )
            )

        if lease_link.lease.organization_id != lease_link.tenant.organization_id:
            issues.append(
                AuditIssue(
                    code="tenant_residency_cross_org_chain",
                    severity="high",
                    org_id=org_id,
                    message="LeaseTenant links a tenant and lease across different organizations.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_tenant_id": lease_link.id,
                        "lease_id": lease_link.lease_id,
                        "lease_org_id": lease_link.lease.organization_id,
                        "linked_tenant_id": lease_link.tenant_id,
                        "tenant_org_id": lease_link.tenant.organization_id,
                    },
                )
            )

    return issues


def _check_duplicate_relationship_rows(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
) -> list[AuditIssue]:
    """Check for duplicate or suspicious lease-link patterns for one tenant.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.

    Returns:
        list[AuditIssue]: Relationship-level findings.
    """
    issues: list[AuditIssue] = []

    # Step 1: Group links by lease ID
    links_by_lease_id: dict[int, list[LeaseTenant]] = {}
    for lease_link in lease_links:
        links_by_lease_id.setdefault(lease_link.lease_id, []).append(lease_link)

    # Step 2: Detect duplicate rows or suspicious multiple-role patterns
    for lease_id, links in links_by_lease_id.items():
        if len(links) > 1:
            issues.append(
                AuditIssue(
                    code="duplicate_tenant_lease_relationship",
                    severity="medium",
                    org_id=org_id,
                    message="Tenant appears more than once on the same lease.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease_id,
                        "lease_tenant_ids": [link.id for link in links],
                        "roles": [link.role for link in links],
                    },
                )
            )

        distinct_roles = sorted({link.role for link in links})
        if len(distinct_roles) > 1:
            issues.append(
                AuditIssue(
                    code="tenant_multiple_roles_same_lease",
                    severity="medium",
                    org_id=org_id,
                    message="Tenant is linked to the same lease with multiple roles.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease_id,
                        "roles": distinct_roles,
                        "lease_tenant_ids": [link.id for link in links],
                    },
                )
            )

        for link in links:
            if link.role not in LeaseTenant.Role.values:
                issues.append(
                    AuditIssue(
                        code="tenant_link_invalid_role",
                        severity="medium",
                        org_id=org_id,
                        message="LeaseTenant row has an invalid or unexpected role value.",
                        payload={
                            "tenant_id": tenant.id,
                            "lease_id": lease_id,
                            "lease_tenant_id": link.id,
                            "role": link.role,
                        },
                    )
                )

    return issues


def _check_status_date_drift(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[AuditIssue]:
    """Detect lease status/date drift that affects tenant residency truth.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.
        today: Evaluation date.

    Returns:
        list[AuditIssue]: Status/date drift findings.
    """
    issues: list[AuditIssue] = []

    # Step 1: Check every linked lease for status/date disagreement
    for lease_link in lease_links:
        lease = lease_link.lease
        active_by_dates = _is_active_on_day(
            start_date=lease.start_date,
            end_date=lease.end_date,
            day=today,
        )

        if lease.status == Lease.Status.ACTIVE and not active_by_dates:
            issues.append(
                AuditIssue(
                    code="tenant_lease_status_active_but_inactive_by_dates",
                    severity="medium",
                    org_id=org_id,
                    message=(
                        "Lease is marked ACTIVE but is not active by end-exclusive "
                        "date semantics."
                    ),
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "start_date": str(lease.start_date),
                        "end_date": str(lease.end_date) if lease.end_date else None,
                        "today": str(today),
                        "stored_status": lease.status,
                    },
                )
            )

        if lease.status == Lease.Status.ENDED and active_by_dates:
            issues.append(
                AuditIssue(
                    code="tenant_lease_status_ended_but_active_by_dates",
                    severity="medium",
                    org_id=org_id,
                    message=(
                        "Lease is marked ENDED but is still active by end-exclusive "
                        "date semantics."
                    ),
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "start_date": str(lease.start_date),
                        "end_date": str(lease.end_date) if lease.end_date else None,
                        "today": str(today),
                        "stored_status": lease.status,
                    },
                )
            )

    return issues


def _check_active_lease_integrity(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[AuditIssue]:
    """Check current-residency truth for one tenant.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.
        today: Evaluation date.

    Returns:
        list[AuditIssue]: Active-residency findings.
    """
    issues: list[AuditIssue] = []
    active_links = _get_active_lease_links(lease_links=lease_links, today=today)

    # Step 1: Detect more than one current active lease for the same tenant
    if len(active_links) > 1:
        issues.append(
            AuditIssue(
                code="tenant_multiple_active_leases",
                severity="high",
                org_id=org_id,
                message="Tenant resolves to more than one active lease today.",
                payload={
                    "tenant_id": tenant.id,
                    "today": str(today),
                    "lease_ids": [link.lease_id for link in active_links],
                    "lease_tenant_ids": [link.id for link in active_links],
                },
            )
        )

    # Step 2: Validate each active lease chain and primary structure
    for lease_link in active_links:
        lease = lease_link.lease
        unit = getattr(lease, "unit", None)
        building = getattr(unit, "building", None)

        if unit is None:
            issues.append(
                AuditIssue(
                    code="tenant_active_lease_missing_unit",
                    severity="high",
                    org_id=org_id,
                    message="Tenant has an active lease that does not resolve to a unit.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "today": str(today),
                    },
                )
            )

        if building is None:
            issues.append(
                AuditIssue(
                    code="tenant_active_lease_missing_building",
                    severity="high",
                    org_id=org_id,
                    message="Tenant has an active lease whose unit does not resolve to a building.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "unit_id": lease.unit_id,
                        "today": str(today),
                    },
                )
            )

        # Step 3: Validate the active lease still has exactly one primary tenant
        primary_count = sum(
            1 for party in lease.parties.all() if party.role == LeaseTenant.Role.PRIMARY
        )
        if primary_count != 1:
            issues.append(
                AuditIssue(
                    code="tenant_active_lease_invalid_primary_structure",
                    severity="high",
                    org_id=org_id,
                    message="Active lease does not resolve to exactly one primary tenant.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "primary_count": primary_count,
                        "today": str(today),
                    },
                )
            )

    return issues


def _check_overlap_integrity(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[AuditIssue]:
    """Check for overlapping tenant lease intervals across history.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.
        today: Evaluation date.

    Returns:
        list[AuditIssue]: Interval-overlap findings.
    """
    issues: list[AuditIssue] = []

    # Step 1: Compare each linked lease interval pair for this tenant
    ordered_links = sorted(
        lease_links,
        key=lambda item: (item.lease.start_date, item.lease.id, item.id),
    )

    for index, current in enumerate(ordered_links):
        for other in ordered_links[index + 1 :]:
            if _intervals_overlap_end_exclusive(
                first_start=current.lease.start_date,
                first_end=current.lease.end_date,
                second_start=other.lease.start_date,
                second_end=other.lease.end_date,
            ):
                current_active_today = (
                    current.lease.status == Lease.Status.ACTIVE
                    and _is_active_on_day(
                        start_date=current.lease.start_date,
                        end_date=current.lease.end_date,
                        day=today,
                    )
                )
                other_active_today = (
                    other.lease.status == Lease.Status.ACTIVE
                    and _is_active_on_day(
                        start_date=other.lease.start_date,
                        end_date=other.lease.end_date,
                        day=today,
                    )
                )

                severity = (
                    "high"
                    if current_active_today and other_active_today
                    else "medium"
                    if current_active_today or other_active_today
                    else "low"
                )

                issues.append(
                    AuditIssue(
                        code="tenant_overlapping_lease_intervals",
                        severity=severity,
                        org_id=org_id,
                        message="Tenant is linked to overlapping lease intervals under end-exclusive semantics.",
                        payload={
                            "tenant_id": tenant.id,
                            "first_lease_id": current.lease_id,
                            "first_lease_tenant_id": current.id,
                            "first_start_date": str(current.lease.start_date),
                            "first_end_date": str(current.lease.end_date)
                            if current.lease.end_date
                            else None,
                            "first_status": current.lease.status,
                            "second_lease_id": other.lease_id,
                            "second_lease_tenant_id": other.id,
                            "second_start_date": str(other.lease.start_date),
                            "second_end_date": str(other.lease.end_date)
                            if other.lease.end_date
                            else None,
                            "second_status": other.lease.status,
                            "rule": "[start_date, end_date)",
                            "today": str(today),
                        },
                    )
                )

    return issues


def _check_history_chain_integrity(
    *,
    org_id: int,
    tenant: Tenant,
    lease_links: list[LeaseTenant],
    today: date,
) -> list[AuditIssue]:
    """Check whether lease history rows can produce valid residence summaries.

    Args:
        org_id: Organization scope.
        tenant: Tenant being audited.
        lease_links: Tenant-linked LeaseTenant rows.
        today: Evaluation date.

    Returns:
        list[AuditIssue]: History-chain findings.
    """
    issues: list[AuditIssue] = []
    active_links = _get_active_lease_links(lease_links=lease_links, today=today)

    # Step 1: Detect tenants with no linked lease history at all
    if not lease_links:
        issues.append(
            AuditIssue(
                code="tenant_has_no_lease_history",
                severity="low",
                org_id=org_id,
                message="Tenant has no linked lease history.",
                payload={
                    "tenant_id": tenant.id,
                },
            )
        )
        return issues

    # Step 2: Detect history rows that cannot build a residence summary
    for lease_link in lease_links:
        lease = lease_link.lease
        unit = getattr(lease, "unit", None)
        building = getattr(unit, "building", None)

        if unit is None:
            issues.append(
                AuditIssue(
                    code="tenant_history_missing_unit",
                    severity="high" if lease_link in active_links else "medium",
                    org_id=org_id,
                    message="Lease history row cannot resolve a unit for tenant residency history.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "is_active_today": lease_link in active_links,
                    },
                )
            )

        if building is None:
            issues.append(
                AuditIssue(
                    code="tenant_history_missing_building",
                    severity="high" if lease_link in active_links else "medium",
                    org_id=org_id,
                    message="Lease history row cannot resolve a building for tenant residency history.",
                    payload={
                        "tenant_id": tenant.id,
                        "lease_id": lease.id,
                        "lease_tenant_id": lease_link.id,
                        "unit_id": lease.unit_id,
                        "is_active_today": lease_link in active_links,
                    },
                )
            )

    return issues


def _build_history_row(
    *,
    lease_link: LeaseTenant,
    today: date,
) -> TenantLeaseHistoryRow:
    """Build one tenant lease-history row for inspection output.

    Args:
        lease_link: Prefetched LeaseTenant row.
        today: Evaluation date.

    Returns:
        TenantLeaseHistoryRow: Structured row for one linked lease.
    """
    # Step 1: Resolve related objects safely
    lease = lease_link.lease
    unit = getattr(lease, "unit", None)
    building = getattr(unit, "building", None)

    # Step 2: Resolve friendly display values
    unit_label = _get_unit_label(unit)
    building_name = _get_building_display_name(lease)

    # Step 3: Compute whether this row is active today
    is_active_today = (
        lease.status == Lease.Status.ACTIVE
        and _is_active_on_day(
            start_date=lease.start_date,
            end_date=lease.end_date,
            day=today,
        )
    )

    return TenantLeaseHistoryRow(
        lease_tenant_id=lease_link.id,
        lease_id=lease.id,
        role=lease_link.role,
        lease_status=lease.status,
        start_date=str(lease.start_date),
        end_date=str(lease.end_date) if lease.end_date else None,
        is_active_today=is_active_today,
        unit_id=lease.unit_id,
        unit_label=unit_label,
        building_id=getattr(building, "id", None),
        building_name=building_name,
    )


def _get_unit_label(unit) -> Optional[str]:
    """Return the best available unit label for audit/debug output.

    Args:
        unit: Related unit instance or None.

    Returns:
        Optional[str]: Friendly unit label when available.
    """
    # Step 1: Guard null unit
    if unit is None:
        return None

    # Step 2: Mirror the tenant serializer fallback order
    return (
        getattr(unit, "unit_label", None)
        or getattr(unit, "unit_number", None)
        or getattr(unit, "name", None)
        or str(unit)
    )


def _get_building_display_name(lease: Lease) -> Optional[str]:
    """Return the most useful building display value available.

    Args:
        lease: Lease with unit/building joins already loaded.

    Returns:
        Optional[str]: Building display value if available.
    """
    # Step 1: Resolve the building object safely
    building = getattr(getattr(lease, "unit", None), "building", None)
    if building is None:
        return None

    # Step 2: Try common building display fields used across projects
    for attribute in ("name", "title", "building_name", "street_address", "address_line_1"):
        value = getattr(building, attribute, None)
        if value:
            return str(value)

    # Step 3: Fall back to a stable identifier when no friendly field exists
    return f"Building #{building.id}"