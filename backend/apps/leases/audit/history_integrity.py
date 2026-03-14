# Filename: backend/apps/leases/audit/history_integrity.py

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any, Optional

from django.db.models import Count, Prefetch, Q, QuerySet
from django.utils import timezone

from apps.buildings.models import Unit
from apps.core.models import Organization
from apps.leases.models import Lease, LeaseTenant, Tenant


@dataclass(frozen=True)
class AuditIssue:
    """Represents one lease-history audit finding.

    Attributes:
        code: Stable machine-friendly identifier for the issue type.
        severity: Severity bucket for logs and review.
        org_id: Organization that owns the problematic row.
        message: Human-readable explanation.
        payload: Structured context for debugging.
    """

    code: str
    severity: str
    org_id: int
    message: str
    payload: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """Return the issue as a serializable dictionary.

        Returns:
            dict[str, Any]: Plain dictionary representation of the issue.
        """
        # Step 1: Convert dataclass fields to a plain dictionary
        return asdict(self)


@dataclass
class AuditReport:
    """Represents the output of a lease history audit run.

    Attributes:
        evaluated_on: Date used to determine active occupancy.
        org_ids: Organizations included in the audit.
        issues: All issues found during the run.
    """

    evaluated_on: date
    org_ids: list[int]
    issues: list[AuditIssue] = field(default_factory=list)

    @property
    def issue_count(self) -> int:
        """Return the total number of findings.

        Returns:
            int: Total issue count.
        """
        # Step 1: Count all issues
        return len(self.issues)

    @property
    def has_issues(self) -> bool:
        """Return whether any issues were found.

        Returns:
            bool: True when the report contains findings.
        """
        # Step 1: Evaluate presence of issues
        return bool(self.issues)

    def summary_by_code(self) -> dict[str, int]:
        """Return issue counts grouped by issue code.

        Returns:
            dict[str, int]: Mapping of issue code to count.
        """
        # Step 1: Aggregate counts by code
        summary: dict[str, int] = {}
        for issue in self.issues:
            summary[issue.code] = summary.get(issue.code, 0) + 1
        return summary

    def summary_by_severity(self) -> dict[str, int]:
        """Return issue counts grouped by severity.

        Returns:
            dict[str, int]: Mapping of severity to count.
        """
        # Step 1: Aggregate counts by severity
        summary: dict[str, int] = {}
        for issue in self.issues:
            summary[issue.severity] = summary.get(issue.severity, 0) + 1
        return summary


def _is_active_on_day(*, start_date: date, end_date: Optional[date], day: date) -> bool:
    """Return whether a lease interval is active on the given day.

    Lease intervals are treated as:

        [start_date, end_date)

    Args:
        start_date: Inclusive lease start date.
        end_date: Exclusive lease end date, or None for open-ended leases.
        day: Date to evaluate.

    Returns:
        bool: True if the lease is active on the given day.
    """
    # Step 1: A lease cannot be active before it starts
    if start_date > day:
        return False

    # Step 2: Open-ended leases remain active after their start date
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
        first_start: Inclusive start for the first interval.
        first_end: Exclusive end for the first interval, or None.
        second_start: Inclusive start for the second interval.
        second_end: Exclusive end for the second interval, or None.

    Returns:
        bool: True if the intervals overlap.
    """
    # Step 1: Compare the second start to the first end
    left = True if first_end is None else second_start < first_end

    # Step 2: Compare the second end to the first start
    right = True if second_end is None else second_end > first_start

    # Step 3: Intervals overlap only if both sides hold
    return left and right


def audit_lease_history_integrity(
    *,
    org_id: Optional[int] = None,
    today: Optional[date] = None,
) -> AuditReport:
    """Run a read-only audit of lease history integrity.

    This function is safe to run in:
    - development
    - staging
    - production

    It does not mutate data.

    Args:
        org_id: Optional organization ID to scope the audit.
        today: Optional evaluation date used for active occupancy checks.

    Returns:
        AuditReport: Structured report containing all findings.
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
            )
        )

    return report


def _audit_single_organization(*, org: Organization, today: date) -> list[AuditIssue]:
    """Audit lease history integrity for a single organization.

    Args:
        org: Organization being audited.
        today: Date used for active occupancy checks.

    Returns:
        list[AuditIssue]: Findings for the organization.
    """
    # Step 1: Load leases with related unit and lease-party data
    leases = list(
        Lease.objects.filter(organization=org)
        .select_related("unit", "unit__building")
        .prefetch_related(
            Prefetch(
                "parties",
                queryset=LeaseTenant.objects.select_related("tenant").order_by("id"),
            )
        )
        .order_by("unit_id", "start_date", "id")
    )

    # Step 2: Load lease-party rows with lease and tenant joins
    lease_tenants = list(
        LeaseTenant.objects.filter(organization=org)
        .select_related("lease", "tenant")
        .order_by("lease_id", "id")
    )

    # Step 3: Load units for occupancy-level validation
    units = list(
        Unit.objects.filter(organization=org)
        .select_related("building")
        .order_by("building_id", "id")
    )

    issues: list[AuditIssue] = []

    # Step 4: Run each audit section clearly and deterministically
    issues.extend(_check_lease_date_integrity(org=org, leases=leases))
    issues.extend(_check_overlap_integrity(org=org, leases=leases))
    issues.extend(
        _check_lease_party_integrity(
            org=org,
            leases=leases,
            lease_tenants=lease_tenants,
        )
    )
    issues.extend(
        _check_cross_org_integrity(
            org=org,
            lease_tenants=lease_tenants,
        )
    )
    issues.extend(
        _check_active_occupancy_integrity(
            org=org,
            today=today,
            leases=leases,
            lease_tenants=lease_tenants,
            units=units,
        )
    )
    issues.extend(
        _check_history_retention_integrity(
            org=org,
            leases=leases,
        )
    )

    return issues


def _check_lease_date_integrity(
    *,
    org: Organization,
    leases: list[Lease],
) -> list[AuditIssue]:
    """Check lease-level date sanity and lease-to-unit integrity.

    Args:
        org: Organization being audited.
        leases: Org-scoped lease rows.

    Returns:
        list[AuditIssue]: Findings for lease date integrity.
    """
    issues: list[AuditIssue] = []

    for lease in leases:
        # Step 1: Detect impossible or degenerate date intervals
        if lease.end_date is not None and lease.end_date <= lease.start_date:
            issues.append(
                AuditIssue(
                    code="invalid_date_range",
                    severity="high",
                    org_id=org.id,
                    message="Lease has end_date less than or equal to start_date.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                        "start_date": str(lease.start_date),
                        "end_date": str(lease.end_date),
                        "status": lease.status,
                    },
                )
            )

        # Step 2: Detect cross-org mismatch between lease and unit
        if lease.unit.organization_id != org.id:
            issues.append(
                AuditIssue(
                    code="lease_unit_org_mismatch",
                    severity="high",
                    org_id=org.id,
                    message="Lease points to a unit owned by a different organization.",
                    payload={
                        "lease_id": lease.id,
                        "lease_org_id": org.id,
                        "unit_id": lease.unit_id,
                        "unit_org_id": lease.unit.organization_id,
                    },
                )
            )

    return issues


def _check_overlap_integrity(
    *,
    org: Organization,
    leases: list[Lease],
) -> list[AuditIssue]:
    """Check for overlapping lease intervals on the same unit.

    Args:
        org: Organization being audited.
        leases: Org-scoped lease rows.

    Returns:
        list[AuditIssue]: Findings for overlapping intervals.
    """
    issues: list[AuditIssue] = []

    # Step 1: Group leases by unit
    leases_by_unit: dict[int, list[Lease]] = {}
    for lease in leases:
        leases_by_unit.setdefault(lease.unit_id, []).append(lease)

    # Step 2: Compare each lease pair inside the same unit
    for unit_id, unit_leases in leases_by_unit.items():
        sorted_leases = sorted(unit_leases, key=lambda item: (item.start_date, item.id))

        for index, current in enumerate(sorted_leases):
            for other in sorted_leases[index + 1 :]:
                if _intervals_overlap_end_exclusive(
                    first_start=current.start_date,
                    first_end=current.end_date,
                    second_start=other.start_date,
                    second_end=other.end_date,
                ):
                    issues.append(
                        AuditIssue(
                            code="overlapping_leases_same_unit",
                            severity="high",
                            org_id=org.id,
                            message="Two leases overlap on the same unit under end-exclusive semantics.",
                            payload={
                                "unit_id": unit_id,
                                "first_lease_id": current.id,
                                "first_start_date": str(current.start_date),
                                "first_end_date": str(current.end_date) if current.end_date else None,
                                "first_status": current.status,
                                "second_lease_id": other.id,
                                "second_start_date": str(other.start_date),
                                "second_end_date": str(other.end_date) if other.end_date else None,
                                "second_status": other.status,
                                "rule": "[start_date, end_date)",
                            },
                        )
                    )

    return issues


def _check_lease_party_integrity(
    *,
    org: Organization,
    leases: list[Lease],
    lease_tenants: list[LeaseTenant],
) -> list[AuditIssue]:
    """Check lease-party cardinality and duplicate tenant links.

    Args:
        org: Organization being audited.
        leases: Org-scoped lease rows.
        lease_tenants: Org-scoped LeaseTenant rows.

    Returns:
        list[AuditIssue]: Findings for lease-party integrity.
    """
    issues: list[AuditIssue] = []

    # Step 1: Group LeaseTenant rows by lease ID
    parties_by_lease: dict[int, list[LeaseTenant]] = {}
    for lease_tenant in lease_tenants:
        parties_by_lease.setdefault(lease_tenant.lease_id, []).append(lease_tenant)

    # Step 2: Validate each lease's party structure
    for lease in leases:
        parties = parties_by_lease.get(lease.id, [])

        if not parties:
            issues.append(
                AuditIssue(
                    code="lease_has_no_parties",
                    severity="medium",
                    org_id=org.id,
                    message="Lease has no LeaseTenant rows.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                        "status": lease.status,
                    },
                )
            )
            continue

        primary_count = sum(
            1 for party in parties if party.role == LeaseTenant.Role.PRIMARY
        )
        if primary_count != 1:
            issues.append(
                AuditIssue(
                    code="invalid_primary_tenant_count",
                    severity="high",
                    org_id=org.id,
                    message="Lease does not have exactly one primary tenant.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                        "party_count": len(parties),
                        "primary_count": primary_count,
                    },
                )
            )

        seen_tenant_ids: set[int] = set()
        duplicate_tenant_ids: set[int] = set()

        for party in parties:
            if party.tenant_id in seen_tenant_ids:
                duplicate_tenant_ids.add(party.tenant_id)
            seen_tenant_ids.add(party.tenant_id)

        if duplicate_tenant_ids:
            issues.append(
                AuditIssue(
                    code="duplicate_tenant_per_lease",
                    severity="medium",
                    org_id=org.id,
                    message="The same tenant appears more than once on the same lease.",
                    payload={
                        "lease_id": lease.id,
                        "tenant_ids": sorted(duplicate_tenant_ids),
                    },
                )
            )

    return issues


def _check_cross_org_integrity(
    *,
    org: Organization,
    lease_tenants: list[LeaseTenant],
) -> list[AuditIssue]:
    """Check for cross-organization relationship mismatches.

    Args:
        org: Organization being audited.
        lease_tenants: Org-scoped LeaseTenant rows.

    Returns:
        list[AuditIssue]: Findings for cross-org integrity.
    """
    issues: list[AuditIssue] = []

    for lease_tenant in lease_tenants:
        # Step 1: Compare LeaseTenant org to lease org
        if lease_tenant.lease.organization_id != org.id:
            issues.append(
                AuditIssue(
                    code="lease_tenant_lease_org_mismatch",
                    severity="high",
                    org_id=org.id,
                    message="LeaseTenant row points to a lease in another organization.",
                    payload={
                        "lease_tenant_id": lease_tenant.id,
                        "link_org_id": org.id,
                        "lease_id": lease_tenant.lease_id,
                        "lease_org_id": lease_tenant.lease.organization_id,
                    },
                )
            )

        # Step 2: Compare LeaseTenant org to tenant org
        if lease_tenant.tenant.organization_id != org.id:
            issues.append(
                AuditIssue(
                    code="lease_tenant_tenant_org_mismatch",
                    severity="high",
                    org_id=org.id,
                    message="LeaseTenant row points to a tenant in another organization.",
                    payload={
                        "lease_tenant_id": lease_tenant.id,
                        "link_org_id": org.id,
                        "tenant_id": lease_tenant.tenant_id,
                        "tenant_org_id": lease_tenant.tenant.organization_id,
                    },
                )
            )

        # Step 3: Compare lease org and tenant org directly
        if lease_tenant.lease.organization_id != lease_tenant.tenant.organization_id:
            issues.append(
                AuditIssue(
                    code="lease_and_tenant_org_mismatch",
                    severity="high",
                    org_id=org.id,
                    message="LeaseTenant links a lease and tenant across different organizations.",
                    payload={
                        "lease_tenant_id": lease_tenant.id,
                        "lease_id": lease_tenant.lease_id,
                        "lease_org_id": lease_tenant.lease.organization_id,
                        "tenant_id": lease_tenant.tenant_id,
                        "tenant_org_id": lease_tenant.tenant.organization_id,
                    },
                )
            )

    return issues


def _check_active_occupancy_integrity(
    *,
    org: Organization,
    today: date,
    leases: list[Lease],
    lease_tenants: list[LeaseTenant],
    units: list[Unit],
) -> list[AuditIssue]:
    """Check current occupancy integrity derived from active lease truth.

    Args:
        org: Organization being audited.
        today: Evaluation date for active occupancy.
        leases: Org-scoped lease rows.
        lease_tenants: Org-scoped LeaseTenant rows.
        units: Org-scoped units.

    Returns:
        list[AuditIssue]: Findings for active occupancy integrity.
    """
    issues: list[AuditIssue] = []

    # Step 1: Build active leases by unit using end-exclusive semantics
    active_leases_by_unit: dict[int, list[Lease]] = {}
    for lease in leases:
        if lease.status == Lease.Status.ACTIVE and _is_active_on_day(
            start_date=lease.start_date,
            end_date=lease.end_date,
            day=today,
        ):
            active_leases_by_unit.setdefault(lease.unit_id, []).append(lease)

    # Step 2: Group lease parties by lease ID
    parties_by_lease: dict[int, list[LeaseTenant]] = {}
    for lease_tenant in lease_tenants:
        parties_by_lease.setdefault(lease_tenant.lease_id, []).append(lease_tenant)

    # Step 3: Validate occupancy unit by unit
    for unit in units:
        active_leases = active_leases_by_unit.get(unit.id, [])

        if len(active_leases) > 1:
            issues.append(
                AuditIssue(
                    code="multiple_active_leases_today",
                    severity="high",
                    org_id=org.id,
                    message="Unit has more than one active lease today.",
                    payload={
                        "unit_id": unit.id,
                        "building_id": unit.building_id,
                        "today": str(today),
                        "lease_ids": [lease.id for lease in active_leases],
                    },
                )
            )

        if len(active_leases) == 1:
            active_lease = active_leases[0]
            primary_count = sum(
                1
                for party in parties_by_lease.get(active_lease.id, [])
                if party.role == LeaseTenant.Role.PRIMARY
            )

            if primary_count != 1:
                issues.append(
                    AuditIssue(
                        code="active_lease_missing_primary",
                        severity="high",
                        org_id=org.id,
                        message="Unit is occupied by an active lease but does not resolve to exactly one primary tenant.",
                        payload={
                            "unit_id": unit.id,
                            "building_id": unit.building_id,
                            "lease_id": active_lease.id,
                            "today": str(today),
                            "primary_count": primary_count,
                        },
                    )
                )

    # Step 4: Detect status/date drift that can cause subtle history bugs
    for lease in leases:
        active_by_dates = _is_active_on_day(
            start_date=lease.start_date,
            end_date=lease.end_date,
            day=today,
        )

        if (
            lease.status == Lease.Status.ACTIVE
            and lease.end_date is not None
            and lease.end_date <= today
        ):
            issues.append(
                AuditIssue(
                    code="lease_status_active_but_ended_by_date",
                    severity="medium",
                    org_id=org.id,
                    message="Lease is marked ACTIVE but its end_date is today or in the past.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                        "today": str(today),
                        "start_date": str(lease.start_date),
                        "end_date": str(lease.end_date),
                    },
                )
            )

        if lease.status == Lease.Status.ENDED and active_by_dates:
            issues.append(
                AuditIssue(
                    code="lease_status_ended_but_active_by_dates",
                    severity="medium",
                    org_id=org.id,
                    message="Lease is marked ENDED but still appears active by date interval.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                        "today": str(today),
                        "start_date": str(lease.start_date),
                        "end_date": str(lease.end_date) if lease.end_date else None,
                    },
                )
            )

    return issues


def _check_history_retention_integrity(
    *,
    org: Organization,
    leases: list[Lease],
) -> list[AuditIssue]:
    """Check that ended lease history still retains critical relationship rows.

    Args:
        org: Organization being audited.
        leases: Org-scoped lease rows.

    Returns:
        list[AuditIssue]: Findings for history retention.
    """
    issues: list[AuditIssue] = []

    # Step 1: Gather ended leases
    ended_leases = [lease for lease in leases if lease.status == Lease.Status.ENDED]
    ended_lease_ids = [lease.id for lease in ended_leases]

    if not ended_lease_ids:
        return issues

    # Step 2: Count lease-party rows attached to ended leases
    ended_party_counts = {
        row["lease_id"]: row["count"]
        for row in (
            LeaseTenant.objects.filter(
                organization=org,
                lease_id__in=ended_lease_ids,
            )
            .values("lease_id")
            .annotate(count=Count("id"))
        )
    }

    # Step 3: Flag ended leases with no lease-party rows
    for lease in ended_leases:
        if ended_party_counts.get(lease.id, 0) == 0:
            issues.append(
                AuditIssue(
                    code="ended_lease_missing_parties",
                    severity="low",
                    org_id=org.id,
                    message="Ended lease has no LeaseTenant rows, weakening historical reconstruction.",
                    payload={
                        "lease_id": lease.id,
                        "unit_id": lease.unit_id,
                    },
                )
            )

    # Step 4: Verify historical tenants still exist
    historical_tenant_ids = set(
        LeaseTenant.objects.filter(
            organization=org,
            lease_id__in=ended_lease_ids,
        ).values_list("tenant_id", flat=True)
    )
    existing_tenant_ids = set(
        Tenant.objects.filter(
            organization=org,
            id__in=historical_tenant_ids,
        ).values_list("id", flat=True)
    )

    missing_tenant_ids = sorted(historical_tenant_ids - existing_tenant_ids)
    for tenant_id in missing_tenant_ids:
        issues.append(
            AuditIssue(
                code="historical_tenant_missing",
                severity="high",
                org_id=org.id,
                message="A tenant referenced by ended lease history is missing.",
                payload={"tenant_id": tenant_id},
            )
        )

    return issues
