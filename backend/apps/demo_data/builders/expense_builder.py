# Filename: backend/apps/demo_data/builders/expense_builder.py

# ✅ New Code

from __future__ import annotations

"""Expense seed builder for deterministic demo portfolio history.

This builder reconciles canonical expense categories, vendors, and expense
records for the seeded demo organization.

Design goals:
- deterministic
- rerunnable
- organization-scoped
- scenario-driven
- easy to understand

Important assumptions:
- This file supports both `category_name` (preferred) and legacy
  `category_slug`.
- Legacy slugs are mapped into the canonical category names defined in
  `apps.expenses.default_categories.DEFAULT_EXPENSE_CATEGORIES`.
- Scenario building/unit/lease codes should match the canonical code maps
  produced by earlier demo builders. This builder also supports a small
  amount of normalization to survive casing and punctuation mismatches.
"""

from dataclasses import asdict, dataclass
from datetime import date
from decimal import Decimal
import re
from typing import Any, Iterable, Mapping

from django.db import transaction

from apps.demo_data.scenarios.expenses import (
    DEMO_EXPENSE_SCENARIOS,
    DEMO_VENDOR_SCENARIOS,
)
from apps.expenses.default_categories import DEFAULT_EXPENSE_CATEGORIES
from apps.expenses.models import Expense, ExpenseCategory, Vendor
from apps.leases.models import Lease

try:
    # Step 1: Prefer the properties domain import if that is your real app path.
    from apps.buildings.models import Building, Unit
except ImportError:  # pragma: no cover
    # Step 2: Fall back to buildings if your project still uses that path.
    from apps.buildings.models import Building, Unit


@dataclass(slots=True)
class ExpenseSeedCounts:
    """Summary counts returned after the seed pass completes."""

    categories_created: int = 0
    categories_reconciled: int = 0
    vendors_created: int = 0
    vendors_reconciled: int = 0
    expenses_created: int = 0
    expenses_reconciled: int = 0

    def to_dict(self) -> dict[str, int]:
        """Return a serializable dictionary summary.

        Returns:
            dict[str, int]: Count summary for command output.
        """
        return asdict(self)


class ExpenseSeedBuilder:
    """Build deterministic expense history for the demo organization.

    Args:
        organization: Organization instance or organization primary key.
        seed_context: Upstream context maps from earlier builders.
        actor: Optional user instance or user primary key for metadata fields.
    """

    def __init__(
        self,
        organization: Any,
        seed_context: Mapping[str, Any] | None = None,
        actor: Any | None = None,
    ) -> None:
        """Initialize the builder with org context and prior seed outputs.

        Args:
            organization: Organization instance or primary key.
            seed_context: Upstream code maps and optional aliases.
            actor: Optional user instance or primary key.
        """
        # Step 3: Normalize organization and actor values to ids.
        self.organization = organization
        self.organization_id = getattr(organization, "id", organization)

        self.seed_context = seed_context or {}
        self.actor = actor
        self.actor_id = getattr(actor, "id", actor)

        self.counts = ExpenseSeedCounts()
        self.categories_by_name: dict[str, ExpenseCategory] = {}
        self.vendors_by_slug: dict[str, Vendor] = {}

        # Step 4: Resolve upstream code maps from prior seed builders.
        self.buildings_by_code = self._resolve_context_map(
            "buildings_by_code",
            "building_map",
        )
        self.units_by_code = self._resolve_context_map(
            "units_by_code",
            "unit_map",
        )
        self.leases_by_code = self._resolve_context_map(
            "leases_by_code",
            "lease_map",
        )

        # Step 5: Optional alias maps can be passed from seed_service later.
        self.building_aliases_by_code = self._resolve_context_map(
            "building_aliases_by_code",
            "building_alias_map",
        )
        self.unit_aliases_by_code = self._resolve_context_map(
            "unit_aliases_by_code",
            "unit_alias_map",
        )
        self.lease_aliases_by_code = self._resolve_context_map(
            "lease_aliases_by_code",
            "lease_alias_map",
        )

    @transaction.atomic
    def build(self) -> dict[str, int]:
        """Run the full deterministic expense seed pass.

        Returns:
            dict[str, int]: Create/reconcile counts for categories, vendors,
            and expenses.
        """
        # Step 6: Reconcile canonical categories first.
        self._seed_categories()

        # Step 7: Reconcile vendors next.
        self._seed_vendors()

        # Step 8: Reconcile all expense occurrences.
        self._seed_expenses()

        return self.counts.to_dict()

    # ------------------------------------------------------------------
    # Category and vendor seeding
    # ------------------------------------------------------------------
    def _seed_categories(self) -> None:
        """Ensure the organization has the canonical default categories."""
        for scenario in DEFAULT_EXPENSE_CATEGORIES:
            defaults = self._filter_supported_fields(
                ExpenseCategory,
                {
                    "kind": scenario.get("kind"),
                    "description": scenario.get("description"),
                    "sort_order": scenario.get("sort_order"),
                },
            )

            category, created = ExpenseCategory.objects.update_or_create(
                organization_id=self.organization_id,
                name=scenario["name"],
                defaults=defaults,
            )

            self.categories_by_name[scenario["name"]] = category

            if created:
                self.counts.categories_created += 1
            else:
                self.counts.categories_reconciled += 1

    def _seed_vendors(self) -> None:
        """Create or reconcile deterministic vendors."""
        for scenario in DEMO_VENDOR_SCENARIOS:
            defaults = self._filter_supported_fields(
                Vendor,
                {
                    "email": scenario.get("email"),
                    "phone": scenario.get("phone"),
                },
            )

            vendor, created = Vendor.objects.update_or_create(
                organization_id=self.organization_id,
                name=scenario["name"],
                defaults=defaults,
            )

            self.vendors_by_slug[scenario["slug"]] = vendor

            if created:
                self.counts.vendors_created += 1
            else:
                self.counts.vendors_reconciled += 1

    # ------------------------------------------------------------------
    # Expense seeding
    # ------------------------------------------------------------------
    def _seed_expenses(self) -> None:
        """Seed all deterministic expense stories across all scopes."""
        self._seed_group(DEMO_EXPENSE_SCENARIOS["organization_recurring"])
        self._seed_group(DEMO_EXPENSE_SCENARIOS["building_recurring"])
        self._seed_group(DEMO_EXPENSE_SCENARIOS["unit_events"])
        self._seed_group(DEMO_EXPENSE_SCENARIOS["lease_events"])

    def _seed_group(self, scenarios: Iterable[dict[str, Any]]) -> None:
        """Expand and reconcile each scenario in a group.

        Args:
            scenarios: Iterable of deterministic scenario dictionaries.
        """
        for scenario in scenarios:
            for expense_date in self._expand_expense_dates(scenario):
                self._reconcile_expense(
                    scenario=scenario,
                    expense_date=expense_date,
                )

    def _reconcile_expense(
        self,
        scenario: dict[str, Any],
        expense_date: date,
    ) -> None:
        """Create or reconcile one deterministic expense occurrence.

        Args:
            scenario: One deterministic expense scenario.
            expense_date: Concrete occurrence date for the scenario.
        """
        # Step 9: Resolve all relational fields first.
        scope_fields = self._build_scope_fields(scenario)
        category_name = self._resolve_category_name(scenario)
        category = self._get_category(category_name)
        vendor = self._get_vendor(scenario["vendor_slug"])

        # Step 10: Normalize core expense values.
        title = scenario["title"]
        amount = self._to_decimal(scenario["amount"])
        notes = self._build_notes(
            scenario=scenario,
            expense_date=expense_date,
        )

        # Step 11: Use deterministic lookup fields.
        lookup = {
            "organization_id": self.organization_id,
            "scope": scenario["scope"],
            "category": category,
            "vendor": vendor,
            "title": title,
            "amount": amount,
            "expense_date": expense_date,
            **scope_fields,
        }

        # Step 12: Only apply supported metadata fields.
        defaults = self._filter_supported_fields(
            Expense,
            {
                "notes": notes,
                "created_by_id": self.actor_id,
                "updated_by_id": self.actor_id,
            },
        )

        _, created = Expense.objects.update_or_create(
            **lookup,
            defaults=defaults,
        )

        if created:
            self.counts.expenses_created += 1
        else:
            self.counts.expenses_reconciled += 1

    def _resolve_category_name(self, scenario: dict[str, Any]) -> str:
        """Resolve the canonical category name from new or legacy keys.

        Args:
            scenario: Expense scenario dictionary.

        Returns:
            str: Canonical category name used by the expenses app.

        Raises:
            ValueError: If neither category key exists or the legacy slug
                cannot be mapped.
        """
        # Step 13: Prefer the new canonical category key.
        if scenario.get("category_name"):
            return scenario["category_name"]

        # Step 14: Fall back to legacy slug support.
        legacy_slug = scenario.get("category_slug")
        if not legacy_slug:
            raise ValueError(
                f"Expense scenario {scenario.get('code', '<unknown>')} is missing "
                "'category_name' and 'category_slug'."
            )

        slug_to_name = {
            "software": "Software / Admin",
            "bookkeeping": "Professional Services",
            "tax-prep": "Professional Services",
            "insurance": "Insurance",
            "utilities": "Utilities",
            "landscaping": "Landscaping / Snow Removal",
            "snow-removal": "Landscaping / Snow Removal",
            "cleaning": "Cleaning And Turnover",
            "pest-control": "Pest Control",
            "repairs": "Repairs And Maintenance",
            "painting": "Repairs And Maintenance",
            "appliances": "Capex / Improvements",
            "locks-security": "Repairs And Maintenance",
        }

        try:
            return slug_to_name[legacy_slug]
        except KeyError as exc:
            raise ValueError(
                f"Unknown legacy category_slug '{legacy_slug}' for expense scenario "
                f"{scenario.get('code', '<unknown>')}."
            ) from exc

    # ------------------------------------------------------------------
    # Scope resolution
    # ------------------------------------------------------------------
    def _build_scope_fields(self, scenario: dict[str, Any]) -> dict[str, Any]:
        """Resolve building, unit, and lease fields for the current scope.

        Args:
            scenario: A single expense scenario definition.

        Returns:
            dict[str, Any]: Relationship fields required by the scope.

        Raises:
            ValueError: If the scope is invalid or relationships do not align.
        """
        scope = scenario["scope"]

        # Step 15: Organization scope must not reference building/unit/lease.
        if scope == "organization":
            return {
                "building": None,
                "unit": None,
                "lease": None,
            }

        # Step 16: Building scope references only a building.
        if scope == "building":
            building = self._get_building(scenario["building_code"])
            return {
                "building": building,
                "unit": None,
                "lease": None,
            }

        # Step 17: Unit scope requires a unit aligned to its declared building.
        if scope == "unit":
            building = self._get_building(scenario["building_code"])
            unit = self._get_unit(scenario["unit_code"])

            if getattr(unit, "building_id", None) != getattr(building, "id", None):
                raise ValueError(
                    "Unit scenario misalignment: unit does not belong to the "
                    f"declared building for code={scenario['code']}."
                )

            return {
                "building": building,
                "unit": unit,
                "lease": None,
            }

        # Step 18: Lease scope derives unit and building from the lease itself.
        if scope == "lease":
            lease = self._get_lease(scenario["lease_code"])
            unit = getattr(lease, "unit", None)
            building = getattr(unit, "building", None) if unit else None

            if unit is None or building is None:
                raise ValueError(
                    "Lease scenario misalignment: could not derive unit/building "
                    f"for code={scenario['code']}."
                )

            return {
                "building": building,
                "unit": unit,
                "lease": lease,
            }

        raise ValueError(f"Unsupported expense scope: {scope}")

    # ------------------------------------------------------------------
    # Date expansion
    # ------------------------------------------------------------------
    def _expand_expense_dates(self, scenario: dict[str, Any]) -> list[date]:
        """Expand a scenario into one or more concrete expense dates.

        Args:
            scenario: Expense scenario dictionary.

        Returns:
            list[date]: Expanded occurrence dates.
        """
        if scenario.get("dates"):
            return [self._parse_date(value) for value in scenario["dates"]]

        if scenario.get("expense_date"):
            return [self._parse_date(scenario["expense_date"])]

        start_date = self._parse_date(scenario["start_date"])
        end_date = self._parse_date(scenario["end_date"])
        frequency = scenario["frequency"]

        month_step_by_frequency = {
            "monthly": 1,
            "every_other_month": 2,
            "quarterly": 3,
            "annual": 12,
        }

        month_step = month_step_by_frequency.get(frequency)
        if month_step is None:
            raise ValueError(f"Unsupported frequency: {frequency}")

        results: list[date] = []
        current = start_date

        while current <= end_date:
            results.append(current)
            current = self._add_months(current, month_step)

        return results

    # ------------------------------------------------------------------
    # Context helpers
    # ------------------------------------------------------------------
    def _resolve_context_map(self, *candidate_keys: str) -> dict[str, Any]:
        """Resolve a map from known context keys produced by prior builders.

        Args:
            *candidate_keys: Candidate dictionary keys to inspect.

        Returns:
            dict[str, Any]: Resolved context map or empty dict.
        """
        for key in candidate_keys:
            value = self.seed_context.get(key)
            if isinstance(value, dict):
                return value

        nested_keys = ("property_context", "lease_context", "contexts", "maps")
        for nested_key in nested_keys:
            nested = self.seed_context.get(nested_key)
            if not isinstance(nested, dict):
                continue

            for key in candidate_keys:
                value = nested.get(key)
                if isinstance(value, dict):
                    return value

        return {}

    def _normalize_code(self, value: str) -> str:
        """Normalize a scenario or seed code for resilient comparisons.

        Args:
            value: Raw code value.

        Returns:
            str: Uppercased alphanumeric-only form.
        """
        return re.sub(r"[^A-Z0-9]", "", str(value).upper())

    def _resolve_code_value(
        self,
        *,
        code: str,
        code_map: Mapping[str, Any],
        alias_map: Mapping[str, Any] | None,
        label: str,
    ) -> Any:
        """Resolve a scenario code against a canonical map.

        Resolution order:
        1. exact match
        2. exact alias match
        3. normalized direct match
        4. normalized alias match

        Args:
            code: Scenario code value.
            code_map: Canonical code->value map.
            alias_map: Optional alias->canonical_code map.
            label: Human-readable entity label for errors.

        Returns:
            Any: The resolved mapped value.

        Raises:
            ValueError: If the code cannot be resolved.
        """
        # Step 19: Exact direct match.
        if code in code_map:
            return code_map[code]

        # Step 20: Exact alias match.
        if alias_map and code in alias_map:
            canonical_code = alias_map[code]
            if canonical_code in code_map:
                return code_map[canonical_code]

        normalized_requested = self._normalize_code(code)

        # Step 21: Normalized direct match.
        for existing_code, value in code_map.items():
            if self._normalize_code(existing_code) == normalized_requested:
                return value

        # Step 22: Normalized alias match.
        if alias_map:
            for alias_code, canonical_code in alias_map.items():
                if self._normalize_code(alias_code) == normalized_requested:
                    if canonical_code in code_map:
                        return code_map[canonical_code]

        available_codes = sorted(code_map.keys())
        raise ValueError(
            f"Unknown {label} code in expense scenario: {code}. "
            f"Available {label} codes: {available_codes}"
        )

    def _get_category(self, name: str) -> ExpenseCategory:
        """Return a canonical expense category by exact name.

        Args:
            name: Canonical category name.

        Returns:
            ExpenseCategory: Resolved category instance.
        """
        try:
            return self.categories_by_name[name]
        except KeyError as exc:
            available_names = sorted(self.categories_by_name.keys())
            raise ValueError(
                f"Unknown expense category name: {name}. "
                f"Available category names: {available_names}"
            ) from exc

    def _get_vendor(self, slug: str) -> Vendor:
        """Return a seeded vendor by scenario slug.

        Args:
            slug: Vendor scenario slug.

        Returns:
            Vendor: Resolved vendor instance.
        """
        try:
            return self.vendors_by_slug[slug]
        except KeyError as exc:
            available_slugs = sorted(self.vendors_by_slug.keys())
            raise ValueError(
                f"Unknown vendor slug: {slug}. "
                f"Available vendor slugs: {available_slugs}"
            ) from exc

    def _get_building(self, code: str) -> Building:
        """Resolve a building from upstream seed context.

        Supports either:
        - {code: Building instance}
        - {code: building_id}

        Args:
            code: Stable building code.

        Returns:
            Building: Resolved building instance.
        """
        value = self._resolve_code_value(
            code=code,
            code_map=self.buildings_by_code,
            alias_map=self.building_aliases_by_code,
            label="building",
        )

        if isinstance(value, Building):
            return value

        return Building.objects.get(
            pk=value,
            organization_id=self.organization_id,
        )

    def _get_unit(self, code: str) -> Unit:
        """Resolve a unit from upstream seed context.

        Supports either:
        - {code: Unit instance}
        - {code: unit_id}

        Args:
            code: Stable unit code.

        Returns:
            Unit: Resolved unit instance.
        """
        value = self._resolve_code_value(
            code=code,
            code_map=self.units_by_code,
            alias_map=self.unit_aliases_by_code,
            label="unit",
        )

        if isinstance(value, Unit):
            return value

        return Unit.objects.select_related("building").get(
            pk=value,
            building__organization_id=self.organization_id,
        )

    def _get_lease(self, code: str) -> Lease:
        """Resolve a lease from upstream seed context.

        Supports either:
        - {code: Lease instance}
        - {code: lease_id}

        Args:
            code: Stable lease code.

        Returns:
            Lease: Resolved lease instance.
        """
        value = self._resolve_code_value(
            code=code,
            code_map=self.leases_by_code,
            alias_map=self.lease_aliases_by_code,
            label="lease",
        )

        if isinstance(value, Lease):
            return value

        return Lease.objects.select_related("unit", "unit__building").get(
            pk=value,
            organization_id=self.organization_id,
        )

    # ------------------------------------------------------------------
    # Primitive helpers
    # ------------------------------------------------------------------
    def _build_notes(
        self,
        scenario: dict[str, Any],
        expense_date: date,
    ) -> str:
        """Build deterministic notes for one expense occurrence.

        Args:
            scenario: Expense scenario dictionary.
            expense_date: Concrete occurrence date.

        Returns:
            str: Deterministic note string.
        """
        template = scenario.get("notes_template", "")
        return (
            f"[demo-seed:{scenario['code']}:{expense_date.isoformat()}] "
            f"{template}"
        ).strip()

    def _parse_date(self, value: str | date) -> date:
        """Parse an ISO date string or return a date object unchanged.

        Args:
            value: ISO date string or date object.

        Returns:
            date: Parsed date object.
        """
        if isinstance(value, date):
            return value
        return date.fromisoformat(value)

    def _to_decimal(self, value: Decimal | str | int | float) -> Decimal:
        """Normalize numeric input to Decimal.

        Args:
            value: Numeric input value.

        Returns:
            Decimal: Normalized decimal value.
        """
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    def _add_months(self, value: date, months: int) -> date:
        """Add whole months while preserving the day when possible.

        Args:
            value: Starting date.
            months: Number of months to add.

        Returns:
            date: Shifted date.
        """
        year = value.year + ((value.month - 1 + months) // 12)
        month = ((value.month - 1 + months) % 12) + 1
        day = min(value.day, self._days_in_month(year=year, month=month))
        return date(year, month, day)

    def _days_in_month(self, year: int, month: int) -> int:
        """Return the number of days in a given month.

        Args:
            year: Target year.
            month: Target month.

        Returns:
            int: Days in the target month.
        """
        if month == 2:
            is_leap_year = year % 4 == 0 and (
                year % 100 != 0 or year % 400 == 0
            )
            return 29 if is_leap_year else 28

        if month in {4, 6, 9, 11}:
            return 30

        return 31

    def _filter_supported_fields(
        self,
        model_class: type,
        field_values: dict[str, Any],
    ) -> dict[str, Any]:
        """Return only keys that exist on the given Django model.

        Args:
            model_class: Django model class to inspect.
            field_values: Candidate field/value pairs.

        Returns:
            dict[str, Any]: Filtered model-supported field map.
        """
        model_field_names = {
            field.name
            for field in model_class._meta.get_fields()
            if getattr(field, "concrete", False)
        }

        return {
            key: value
            for key, value in field_values.items()
            if key in model_field_names and value is not None
        }