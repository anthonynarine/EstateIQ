
"""
Validation services for expense write workflows.
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from apps.expenses.choices import ExpenseScope, ExpenseStatus, ReimbursementStatus


class ExpenseValidationService:
    """Business-rule validation service for expense writes."""

    @classmethod
    def validate_expense_data(cls, *, data: dict[str, Any]) -> None:
        """Run full service-layer validation for an expense write.

        Args:
            data: Normalized model-like expense data.

        Raises:
            ValidationError: If any business rule is violated.
        """
        cls._validate_scope_shape(data=data)
        cls._validate_org_consistency(data=data)
        cls._validate_unit_building_consistency(data=data)
        cls._validate_lease_consistency_and_derivations(data=data)
        cls._validate_status_dates(data=data)
        cls._validate_reimbursement_state(data=data)

    @classmethod
    def _validate_scope_shape(cls, *, data: dict[str, Any]) -> None:
        """Validate required/null relationships based on expense scope.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If scope-specific shape rules are violated.
        """
        scope = data["scope"]
        building = data.get("building")
        unit = data.get("unit")
        lease = data.get("lease")

        if scope == ExpenseScope.ORGANIZATION:
            if building or unit or lease:
                raise ValidationError(
                    "Organization-scoped expenses cannot reference building, "
                    "unit, or lease."
                )

        elif scope == ExpenseScope.BUILDING:
            if not building:
                raise ValidationError(
                    "Building-scoped expenses require a building."
                )
            if unit or lease:
                raise ValidationError(
                    "Building-scoped expenses cannot reference unit or lease."
                )

        elif scope == ExpenseScope.UNIT:
            if not building or not unit:
                raise ValidationError(
                    "Unit-scoped expenses require both building and unit."
                )
            if lease:
                raise ValidationError(
                    "Unit-scoped expenses cannot reference a lease."
                )

        elif scope == ExpenseScope.LEASE:
            if not lease:
                raise ValidationError(
                    "Lease-scoped expenses require a lease."
                )

        else:
            raise ValidationError("Invalid expense scope.")

    @classmethod
    def _validate_org_consistency(cls, *, data: dict[str, Any]) -> None:
        """Validate all related objects belong to the same organization.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If a related object belongs to another
                organization.
        """
        organization = data["organization"]

        building = data.get("building")
        unit = data.get("unit")
        lease = data.get("lease")
        category = data.get("category")
        vendor = data.get("vendor")

        if building and building.organization_id != organization.id:
            raise ValidationError(
                "Building does not belong to the selected organization."
            )

        if unit and unit.organization_id != organization.id:
            raise ValidationError(
                "Unit does not belong to the selected organization."
            )

        if lease and lease.organization_id != organization.id:
            raise ValidationError(
                "Lease does not belong to the selected organization."
            )

        if category and category.organization_id != organization.id:
            raise ValidationError(
                "Category does not belong to the selected organization."
            )

        if vendor and vendor.organization_id != organization.id:
            raise ValidationError(
                "Vendor does not belong to the selected organization."
            )

    @classmethod
    def _validate_unit_building_consistency(
        cls,
        *,
        data: dict[str, Any],
    ) -> None:
        """Validate that the selected unit belongs to the selected building.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If unit/building relationships are invalid.
        """
        building = data.get("building")
        unit = data.get("unit")

        if unit and not building:
            raise ValidationError(
                "A unit cannot be set without a building."
            )

        if unit and building and unit.building_id != building.id:
            raise ValidationError(
                "Selected unit does not belong to the selected building."
            )

    @classmethod
    def _validate_lease_consistency_and_derivations(
        cls,
        *,
        data: dict[str, Any],
    ) -> None:
        """Validate lease consistency and derive building/unit from lease.

        For lease-scoped expenses, building and unit are deterministic facts
        derived from the lease relationship. The service layer persists them
        onto the expense for future reporting efficiency.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If lease relationships are invalid.
        """
        lease = data.get("lease")
        scope = data["scope"]

        if not lease:
            return

        lease_unit = getattr(lease, "unit", None)
        if lease_unit is None:
            raise ValidationError(
                "Lease-scoped expense requires a lease with an associated unit."
            )

        lease_building = getattr(lease_unit, "building", None)
        if lease_building is None:
            raise ValidationError("Lease unit must belong to a building.")

        if scope != ExpenseScope.LEASE:
            raise ValidationError(
                "A lease may only be attached to a lease-scoped expense."
            )

        incoming_building = data.get("building")
        incoming_unit = data.get("unit")

        if incoming_building and incoming_building.id != lease_building.id:
            raise ValidationError(
                "Selected building does not match the lease building."
            )

        if incoming_unit and incoming_unit.id != lease_unit.id:
            raise ValidationError(
                "Selected unit does not match the lease unit."
            )

        data["building"] = lease_building
        data["unit"] = lease_unit

    @classmethod
    def _validate_status_dates(cls, *, data: dict[str, Any]) -> None:
        """Validate status/date consistency for expense workflow.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If status and date fields conflict.
        """
        status = data.get("status")
        paid_date = data.get("paid_date")

        if status == ExpenseStatus.PAID and not paid_date:
            raise ValidationError("Paid expenses must include a paid_date.")

        if status != ExpenseStatus.PAID and paid_date:
            raise ValidationError(
                "Only expenses with paid status may include a paid_date."
            )

        if status == ExpenseStatus.CANCELLED and paid_date:
            raise ValidationError(
                "Cancelled expenses cannot have a paid_date."
            )

    @classmethod
    def _validate_reimbursement_state(cls, *, data: dict[str, Any]) -> None:
        """Validate reimbursement flags and reimbursement status combinations.

        Args:
            data: Normalized expense data.

        Raises:
            ValidationError: If reimbursement fields are inconsistent.
        """
        is_reimbursable = data.get("is_reimbursable", False)
        reimbursement_status = data.get(
            "reimbursement_status",
            ReimbursementStatus.NOT_APPLICABLE,
        )

        if (
            not is_reimbursable
            and reimbursement_status != ReimbursementStatus.NOT_APPLICABLE
        ):
            raise ValidationError(
                "Non-reimbursable expenses must use reimbursement status "
                "'not_applicable'."
            )

        if (
            is_reimbursable
            and reimbursement_status == ReimbursementStatus.NOT_APPLICABLE
        ):
            raise ValidationError(
                "Reimbursable expenses must use a reimbursement-aware status."
            )