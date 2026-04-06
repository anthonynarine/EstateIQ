# Filename: backend/apps/demo_data/verification.py

# ✅ New Code

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.billing.selectors.ledger_selectors import LeaseLedgerSelectors
from apps.expenses.models import Expense
from apps.leases.models import Lease


@dataclass(frozen=True)
class VerificationCheckResult:
    """One verification check result."""

    name: str
    passed: bool
    details: str


@dataclass(frozen=True)
class DemoVerificationResult:
    """Structured result for demo seed verification."""

    passed: bool
    checks: list[VerificationCheckResult]


class DemoVerificationService:
    """Verify that seeded leasing, billing, and expense history is trustworthy."""

    @classmethod
    def verify(
        cls,
        *,
        organization_id: int,
        building_ids_by_code: dict[str, int],
        unit_ids_by_code: dict[str, int],
        lease_ids_by_code: dict[str, int],
    ) -> DemoVerificationResult:
        """Run the current verification suite.

        Args:
            organization_id: Target organization primary key.
            building_ids_by_code: Stable building code -> building id lookup.
            unit_ids_by_code: Stable unit code -> unit id lookup.
            lease_ids_by_code: Stable lease code -> lease id lookup.

        Returns:
            DemoVerificationResult: Aggregate verification result.
        """
        checks: list[VerificationCheckResult] = []

        # Step 1: Global lease integrity check.
        checks.append(
            cls._check_no_multiple_active_leases_per_unit(
                organization_id=organization_id,
            )
        )

        # Step 2: Vacancy expectation checks.
        for unit_code in ["MAPLE-1C", "RIVER-3B", "HARBOR-C"]:
            if unit_code in unit_ids_by_code:
                checks.append(
                    cls._check_unit_has_no_active_lease(
                        organization_id=organization_id,
                        unit_id=unit_ids_by_code[unit_code],
                        unit_code=unit_code,
                    )
                )

        # Step 3: Turnover history check.
        if "MAPLE-1A" in unit_ids_by_code:
            checks.append(
                cls._check_unit_has_expected_history(
                    organization_id=organization_id,
                    unit_id=unit_ids_by_code["MAPLE-1A"],
                    unit_code="MAPLE-1A",
                    minimum_lease_count=3,
                    expected_active_count=1,
                )
            )

        # Step 4: Healthy ledger checks.
        for lease_code in ["LEASE-RIVER-2A-2021", "LEASE-MAPLE-1A-2021"]:
            if lease_code in lease_ids_by_code:
                checks.append(
                    cls._check_lease_has_zero_balance(
                        organization_id=organization_id,
                        lease_id=lease_ids_by_code[lease_code],
                        lease_code=lease_code,
                    )
                )

        # Step 5: Positive-balance checks for partial + delinquent leases.
        for lease_code in ["LEASE-MAPLE-1B-2022", "LEASE-RIVER-2B-2023"]:
            if lease_code in lease_ids_by_code:
                checks.append(
                    cls._check_lease_has_positive_balance(
                        organization_id=organization_id,
                        lease_id=lease_ids_by_code[lease_code],
                        lease_code=lease_code,
                    )
                )

        # Step 6: Sample ledger activity checks.
        for lease_code in ["LEASE-RIVER-2A-2021", "LEASE-RIVER-2B-2023"]:
            if lease_code in lease_ids_by_code:
                checks.append(
                    cls._check_lease_has_ledger_activity(
                        organization_id=organization_id,
                        lease_id=lease_ids_by_code[lease_code],
                        lease_code=lease_code,
                    )
                )

        # Step 7: Expense scope coverage checks.
        checks.append(
            cls._check_expenses_exist_across_scopes(
                organization_id=organization_id,
            )
        )

        # Step 8: Prove that currently vacant units can still have history.
        checks.append(
            cls._check_vacant_units_can_have_historical_expenses(
                organization_id=organization_id,
                unit_ids_by_code=unit_ids_by_code,
            )
        )

        # Step 9: Validate lease-scoped expense relationship alignment.
        checks.append(
            cls._check_lease_scoped_expense_relationships(
                organization_id=organization_id,
            )
        )

        # Step 10: Validate recurring building expense density.
        checks.append(
            cls._check_building_recurring_expense_density(
                organization_id=organization_id,
                building_ids_by_code=building_ids_by_code,
                minimum_count_per_building=2,
                minimum_building_count=2,
            )
        )

        passed = all(check.passed for check in checks)
        return DemoVerificationResult(
            passed=passed,
            checks=checks,
        )

    @staticmethod
    def _get_lease_balance(
        *,
        organization_id: int,
        lease_id: int,
    ) -> Decimal:
        """Return the current derived lease balance."""
        # Step 1: Build the current ledger read model.
        ledger = LeaseLedgerSelectors.build_lease_ledger(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        # Step 2: Normalize the balance string into Decimal.
        return Decimal(ledger["totals"]["balance"])

    @staticmethod
    def _get_ledger_counts(
        *,
        organization_id: int,
        lease_id: int,
    ) -> tuple[int, int]:
        """Return charge/payment row counts for a lease ledger."""
        # Step 1: Build the current ledger read model.
        ledger = LeaseLedgerSelectors.build_lease_ledger(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        return len(ledger["charges"]), len(ledger["payments"])

    @staticmethod
    def _active_lease_count_for_unit(
        *,
        organization_id: int,
        unit_id: int,
    ) -> int:
        """Return the number of active leases for a unit."""
        # Step 1: Count active leases for this unit.
        return Lease.objects.filter(
            organization_id=organization_id,
            unit_id=unit_id,
            status=Lease.Status.ACTIVE,
        ).count()

    @staticmethod
    def _expense_queryset(
        *,
        organization_id: int,
    ):
        """Return a base organization-scoped expense queryset."""
        queryset = Expense.objects.filter(organization_id=organization_id)

        expense_field_names = {
            field.name
            for field in Expense._meta.get_fields()
            if getattr(field, "concrete", False)
        }

        if "is_archived" in expense_field_names:
            queryset = queryset.filter(is_archived=False)

        return queryset

    @classmethod
    def _check_no_multiple_active_leases_per_unit(
        cls,
        *,
        organization_id: int,
    ) -> VerificationCheckResult:
        """Verify that no unit has more than one active lease."""
        # Step 1: Inspect all active leases in the org.
        active_leases = Lease.objects.filter(
            organization_id=organization_id,
            status=Lease.Status.ACTIVE,
        ).values_list("unit_id", flat=True)

        unit_counts: dict[int, int] = {}
        for unit_id in active_leases:
            unit_counts[unit_id] = unit_counts.get(unit_id, 0) + 1

        offenders = [unit_id for unit_id, count in unit_counts.items() if count > 1]

        if offenders:
            return VerificationCheckResult(
                name="no_multiple_active_leases_per_unit",
                passed=False,
                details=f"Units with multiple active leases: {offenders}",
            )

        return VerificationCheckResult(
            name="no_multiple_active_leases_per_unit",
            passed=True,
            details="Every unit has at most one active lease.",
        )

    @classmethod
    def _check_unit_has_no_active_lease(
        cls,
        *,
        organization_id: int,
        unit_id: int,
        unit_code: str,
    ) -> VerificationCheckResult:
        """Verify that a unit is currently vacant."""
        # Step 1: Count active leases for the unit.
        active_count = cls._active_lease_count_for_unit(
            organization_id=organization_id,
            unit_id=unit_id,
        )

        if active_count != 0:
            return VerificationCheckResult(
                name=f"vacant_unit_{unit_code}",
                passed=False,
                details=f"{unit_code} expected 0 active leases but found {active_count}.",
            )

        return VerificationCheckResult(
            name=f"vacant_unit_{unit_code}",
            passed=True,
            details=f"{unit_code} is correctly vacant.",
        )

    @classmethod
    def _check_unit_has_expected_history(
        cls,
        *,
        organization_id: int,
        unit_id: int,
        unit_code: str,
        minimum_lease_count: int,
        expected_active_count: int,
    ) -> VerificationCheckResult:
        """Verify that a unit has turnover history and expected active count."""
        # Step 1: Count all lease history rows for the unit.
        total_leases = Lease.objects.filter(
            organization_id=organization_id,
            unit_id=unit_id,
        ).count()

        # Step 2: Count current active leases for the unit.
        active_count = cls._active_lease_count_for_unit(
            organization_id=organization_id,
            unit_id=unit_id,
        )

        passed = (
            total_leases >= minimum_lease_count
            and active_count == expected_active_count
        )

        if not passed:
            return VerificationCheckResult(
                name=f"turnover_history_{unit_code}",
                passed=False,
                details=(
                    f"{unit_code} expected at least {minimum_lease_count} leases "
                    f"and {expected_active_count} active, found "
                    f"{total_leases} total and {active_count} active."
                ),
            )

        return VerificationCheckResult(
            name=f"turnover_history_{unit_code}",
            passed=True,
            details=(
                f"{unit_code} has {total_leases} leases and {active_count} active."
            ),
        )

    @classmethod
    def _check_lease_has_zero_balance(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        lease_code: str,
    ) -> VerificationCheckResult:
        """Verify that a lease balance is fully closed/current."""
        # Step 1: Derive the current lease balance.
        balance = cls._get_lease_balance(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        if balance != Decimal("0.00"):
            return VerificationCheckResult(
                name=f"zero_balance_{lease_code}",
                passed=False,
                details=f"{lease_code} expected 0.00 balance but found {balance}.",
            )

        return VerificationCheckResult(
            name=f"zero_balance_{lease_code}",
            passed=True,
            details=f"{lease_code} has zero balance.",
        )

    @classmethod
    def _check_lease_has_positive_balance(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        lease_code: str,
    ) -> VerificationCheckResult:
        """Verify that a lease has a meaningful open balance."""
        # Step 1: Derive the current lease balance.
        balance = cls._get_lease_balance(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        if balance <= Decimal("0.00"):
            return VerificationCheckResult(
                name=f"positive_balance_{lease_code}",
                passed=False,
                details=f"{lease_code} expected positive balance but found {balance}.",
            )

        return VerificationCheckResult(
            name=f"positive_balance_{lease_code}",
            passed=True,
            details=f"{lease_code} has positive balance {balance}.",
        )

    @classmethod
    def _check_lease_has_ledger_activity(
        cls,
        *,
        organization_id: int,
        lease_id: int,
        lease_code: str,
    ) -> VerificationCheckResult:
        """Verify that a lease ledger actually contains charges and payments."""
        # Step 1: Read charge and payment counts.
        charge_count, payment_count = cls._get_ledger_counts(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        passed = charge_count > 0 and payment_count > 0

        if not passed:
            return VerificationCheckResult(
                name=f"ledger_activity_{lease_code}",
                passed=False,
                details=(
                    f"{lease_code} expected ledger activity but found "
                    f"{charge_count} charges and {payment_count} payments."
                ),
            )

        return VerificationCheckResult(
            name=f"ledger_activity_{lease_code}",
            passed=True,
            details=(
                f"{lease_code} has {charge_count} charges and {payment_count} payments."
            ),
        )

    @classmethod
    def _check_expenses_exist_across_scopes(
        cls,
        *,
        organization_id: int,
    ) -> VerificationCheckResult:
        """Verify that seeded expense history exists across all intended scopes."""
        # Step 1: Count seeded expenses by scope.
        queryset = cls._expense_queryset(organization_id=organization_id)
        counts = {
            "organization": queryset.filter(scope="organization").count(),
            "building": queryset.filter(scope="building").count(),
            "unit": queryset.filter(scope="unit").count(),
            "lease": queryset.filter(scope="lease").count(),
        }

        missing_scopes = [
            scope_name
            for scope_name, count in counts.items()
            if count <= 0
        ]

        if missing_scopes:
            return VerificationCheckResult(
                name="expense_scope_coverage",
                passed=False,
                details=(
                    "Missing seeded expenses for scopes: "
                    f"{', '.join(missing_scopes)}. Counts={counts}"
                ),
            )

        return VerificationCheckResult(
            name="expense_scope_coverage",
            passed=True,
            details=f"Expense scope counts verified: {counts}",
        )

    @classmethod
    def _check_vacant_units_can_have_historical_expenses(
        cls,
        *,
        organization_id: int,
        unit_ids_by_code: dict[str, int],
    ) -> VerificationCheckResult:
        """Verify that at least one currently vacant unit still has expense history."""
        # Step 1: Find currently vacant units from the seeded lookup map.
        vacant_unit_codes: list[str] = []
        for unit_code, unit_id in unit_ids_by_code.items():
            active_count = cls._active_lease_count_for_unit(
                organization_id=organization_id,
                unit_id=unit_id,
            )
            if active_count == 0:
                vacant_unit_codes.append(unit_code)

        if not vacant_unit_codes:
            return VerificationCheckResult(
                name="vacant_units_historical_expenses",
                passed=False,
                details="No currently vacant units were found to test expense history.",
            )

        # Step 2: Prove at least one currently vacant unit has expense history.
        queryset = cls._expense_queryset(organization_id=organization_id)
        qualifying_units: list[str] = []

        for unit_code in vacant_unit_codes:
            unit_id = unit_ids_by_code[unit_code]
            if queryset.filter(unit_id=unit_id).exists():
                qualifying_units.append(unit_code)

        if not qualifying_units:
            return VerificationCheckResult(
                name="vacant_units_historical_expenses",
                passed=False,
                details=(
                    "Vacant units were found, but none had historical unit/lease "
                    f"expense linkage. Vacant units={vacant_unit_codes}"
                ),
            )

        return VerificationCheckResult(
            name="vacant_units_historical_expenses",
            passed=True,
            details=(
                "Vacant units with preserved expense history: "
                f"{qualifying_units}"
            ),
        )

    @classmethod
    def _check_lease_scoped_expense_relationships(
        cls,
        *,
        organization_id: int,
    ) -> VerificationCheckResult:
        """Verify lease-scoped expenses align to valid lease/unit/building chains."""
        # Step 1: Read lease-scoped expenses with related lease context.
        queryset = cls._expense_queryset(
            organization_id=organization_id,
        ).filter(
            scope="lease",
            lease_id__isnull=False,
        ).select_related(
            "lease",
            "unit",
            "building",
            "lease__unit",
            "lease__unit__building",
        )

        if not queryset.exists():
            return VerificationCheckResult(
                name="lease_expense_relationship_alignment",
                passed=False,
                details="No lease-scoped expenses were found for verification.",
            )

        # Step 2: Check that each expense agrees with its lease chain.
        invalid_expense_ids: list[int] = []
        for expense in queryset:
            lease = getattr(expense, "lease", None)
            lease_unit = getattr(lease, "unit", None) if lease else None
            lease_building = (
                getattr(lease_unit, "building", None)
                if lease_unit is not None
                else None
            )

            unit_matches = getattr(expense, "unit_id", None) == getattr(
                lease_unit,
                "id",
                None,
            )
            building_matches = getattr(expense, "building_id", None) == getattr(
                lease_building,
                "id",
                None,
            )

            if lease is None or lease_unit is None or lease_building is None:
                invalid_expense_ids.append(expense.id)
                continue

            if not unit_matches or not building_matches:
                invalid_expense_ids.append(expense.id)

        if invalid_expense_ids:
            return VerificationCheckResult(
                name="lease_expense_relationship_alignment",
                passed=False,
                details=(
                    "Lease-scoped expenses with invalid lease/unit/building "
                    f"alignment: {invalid_expense_ids}"
                ),
            )

        return VerificationCheckResult(
            name="lease_expense_relationship_alignment",
            passed=True,
            details="All lease-scoped expenses align to valid lease/unit/building chains.",
        )

    @classmethod
    def _check_building_recurring_expense_density(
        cls,
        *,
        organization_id: int,
        building_ids_by_code: dict[str, int],
        minimum_count_per_building: int,
        minimum_building_count: int,
    ) -> VerificationCheckResult:
        """Verify recurring building-scoped expense density exists on selected buildings."""
        # Step 1: Select a stable subset of buildings to test.
        selected_items = sorted(building_ids_by_code.items())[:minimum_building_count]
        if len(selected_items) < minimum_building_count:
            return VerificationCheckResult(
                name="building_recurring_expense_density",
                passed=False,
                details=(
                    "Not enough seeded buildings were available for density checks. "
                    f"Found {len(selected_items)}."
                ),
            )

        # Step 2: Count building-scoped expenses per selected building.
        queryset = cls._expense_queryset(organization_id=organization_id)
        failures: list[str] = []
        passing_counts: dict[str, int] = {}

        for building_code, building_id in selected_items:
            count = queryset.filter(
                scope="building",
                building_id=building_id,
            ).count()

            if count < minimum_count_per_building:
                failures.append(
                    f"{building_code}={count} (< {minimum_count_per_building})"
                )
            else:
                passing_counts[building_code] = count

        if failures:
            return VerificationCheckResult(
                name="building_recurring_expense_density",
                passed=False,
                details=(
                    "Selected buildings did not have enough recurring building-scoped "
                    f"expense density. Failures={failures}"
                ),
            )

        return VerificationCheckResult(
            name="building_recurring_expense_density",
            passed=True,
            details=f"Recurring building expense density verified: {passing_counts}",
        )