# Filename: backend/apps/demo_data/verification.py

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.billing.selectors.ledger_selectors import LeaseLedgerSelectors
from apps.leases.models import Lease


# ✅ New Code


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
    """Verify that seeded leasing and billing history matches expectations."""

    @classmethod
    def verify(
        cls,
        *,
        organization_id: int,
        unit_ids_by_code: dict[str, int],
        lease_ids_by_code: dict[str, int],
    ) -> DemoVerificationResult:
        """Run the current verification suite for demo leasing and billing.

        Args:
            organization_id: Target organization primary key.
            unit_ids_by_code: Stable unit code -> unit id lookup.
            lease_ids_by_code: Stable lease code -> lease id lookup.

        Returns:
            DemoVerificationResult: Aggregate verification result.
        """
        checks: list[VerificationCheckResult] = []

        # Step 1: global lease integrity check
        checks.append(
            cls._check_no_multiple_active_leases_per_unit(
                organization_id=organization_id,
            )
        )

        # Step 2: vacancy expectation checks
        for unit_code in ["MAPLE-1C", "RIVER-3B", "HARBOR-C"]:
            checks.append(
                cls._check_unit_has_no_active_lease(
                    organization_id=organization_id,
                    unit_id=unit_ids_by_code[unit_code],
                    unit_code=unit_code,
                )
            )

        # Step 3: turnover history check
        checks.append(
            cls._check_unit_has_expected_history(
                organization_id=organization_id,
                unit_id=unit_ids_by_code["MAPLE-1A"],
                unit_code="MAPLE-1A",
                minimum_lease_count=3,
                expected_active_count=1,
            )
        )

        # Step 4: healthy ledger checks
        checks.append(
            cls._check_lease_has_zero_balance(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-RIVER-2A-2021"],
                lease_code="LEASE-RIVER-2A-2021",
            )
        )
        checks.append(
            cls._check_lease_has_zero_balance(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-MAPLE-1A-2021"],
                lease_code="LEASE-MAPLE-1A-2021",
            )
        )

        # Step 5: positive-balance checks for partial + delinquent leases
        checks.append(
            cls._check_lease_has_positive_balance(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-MAPLE-1B-2022"],
                lease_code="LEASE-MAPLE-1B-2022",
            )
        )
        checks.append(
            cls._check_lease_has_positive_balance(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-RIVER-2B-2023"],
                lease_code="LEASE-RIVER-2B-2023",
            )
        )

        # Step 6: sample ledger activity checks
        checks.append(
            cls._check_lease_has_ledger_activity(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-RIVER-2A-2021"],
                lease_code="LEASE-RIVER-2A-2021",
            )
        )
        checks.append(
            cls._check_lease_has_ledger_activity(
                organization_id=organization_id,
                lease_id=lease_ids_by_code["LEASE-RIVER-2B-2023"],
                lease_code="LEASE-RIVER-2B-2023",
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
        """Return the current derived lease balance.

        Args:
            organization_id: Target organization primary key.
            lease_id: Lease primary key.

        Returns:
            Decimal: Current derived lease balance.
        """
        # Step 1: build the current ledger read model
        ledger = LeaseLedgerSelectors.build_lease_ledger(
            organization_id=organization_id,
            lease_id=lease_id,
        )

        # Step 2: normalize the balance string into Decimal
        return Decimal(ledger["totals"]["balance"])

    @staticmethod
    def _get_ledger_counts(
        *,
        organization_id: int,
        lease_id: int,
    ) -> tuple[int, int]:
        """Return charge/payment row counts for a lease ledger.

        Args:
            organization_id: Target organization primary key.
            lease_id: Lease primary key.

        Returns:
            tuple[int, int]: Charge count and payment count.
        """
        # Step 1: build the current ledger read model
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
        """Return the number of active leases for a unit.

        Args:
            organization_id: Target organization primary key.
            unit_id: Unit primary key.

        Returns:
            int: Active lease count.
        """
        # Step 1: count active leases for this unit
        return Lease.objects.filter(
            organization_id=organization_id,
            unit_id=unit_id,
            status=Lease.Status.ACTIVE,
        ).count()

    @classmethod
    def _check_no_multiple_active_leases_per_unit(
        cls,
        *,
        organization_id: int,
    ) -> VerificationCheckResult:
        """Verify that no unit has more than one active lease.

        Args:
            organization_id: Target organization primary key.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: inspect all active leases in the org
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
        """Verify that a unit is currently vacant.

        Args:
            organization_id: Target organization primary key.
            unit_id: Unit primary key.
            unit_code: Stable unit scenario code.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: count active leases for the unit
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
        """Verify that a unit has turnover history and expected active count.

        Args:
            organization_id: Target organization primary key.
            unit_id: Unit primary key.
            unit_code: Stable unit scenario code.
            minimum_lease_count: Minimum lease history count expected.
            expected_active_count: Expected active lease count.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: count all lease history rows for the unit
        total_leases = Lease.objects.filter(
            organization_id=organization_id,
            unit_id=unit_id,
        ).count()

        # Step 2: count current active leases for the unit
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
        """Verify that a lease balance is fully closed/current.

        Args:
            organization_id: Target organization primary key.
            lease_id: Lease primary key.
            lease_code: Stable lease scenario code.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: derive the current lease balance
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
        """Verify that a lease has a meaningful open balance.

        Args:
            organization_id: Target organization primary key.
            lease_id: Lease primary key.
            lease_code: Stable lease scenario code.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: derive the current lease balance
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
        """Verify that a lease ledger actually contains charges and payments.

        Args:
            organization_id: Target organization primary key.
            lease_id: Lease primary key.
            lease_code: Stable lease scenario code.

        Returns:
            VerificationCheckResult: Check result.
        """
        # Step 1: read charge and payment counts
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