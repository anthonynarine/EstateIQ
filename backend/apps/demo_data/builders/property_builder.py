# Filename: backend/apps/demo_data/builders/property_builder.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db import transaction

from apps.buildings.models import Building, Unit
from apps.core.models import Organization
from apps.demo_data.scenarios import DEMO_BUILDING_SCENARIOS


@dataclass(frozen=True)
class DemoPropertyBuildResult:
    """Structured result for seeded property references."""

    building_ids_by_code: dict[str, int]
    unit_ids_by_code: dict[str, int]


class DemoPropertyBuilder:
    """Create or reconcile the deterministic demo property footprint."""

    @classmethod
    @transaction.atomic
    def build(
        cls,
        *,
        organization_id: int,
    ) -> DemoPropertyBuildResult:
        """Create or reconcile demo buildings and units for an organization.

        Args:
            organization_id: Target organization primary key.

        Returns:
            DemoPropertyBuildResult: Stable code-to-id lookup maps.
        """
        # Step 1: verify the organization exists
        organization = Organization.objects.get(id=organization_id)

        building_ids_by_code: dict[str, int] = {}
        unit_ids_by_code: dict[str, int] = {}

        # Step 2: build the configured building footprint
        for building_scenario in DEMO_BUILDING_SCENARIOS:
            building = cls._build_building(
                organization=organization,
                scenario=building_scenario,
            )
            building_ids_by_code[building_scenario["code"]] = building.id

            # Step 3: build the configured units under this building
            for unit_scenario in building_scenario["units"]:
                unit = cls._build_unit(
                    organization=organization,
                    building=building,
                    scenario=unit_scenario,
                )
                unit_ids_by_code[unit_scenario["code"]] = unit.id

        return DemoPropertyBuildResult(
            building_ids_by_code=building_ids_by_code,
            unit_ids_by_code=unit_ids_by_code,
        )

    @staticmethod
    def _build_building(
        *,
        organization: Organization,
        scenario: dict[str, Any],
    ) -> Building:
        """Create or reconcile one building from a scenario definition.

        Args:
            organization: Target organization instance.
            scenario: Building scenario payload.

        Returns:
            Building: Created or updated building instance.
        """
        # Step 1: get or create by org + building name
        building, _ = Building.objects.get_or_create(
            organization=organization,
            name=scenario["name"],
            defaults={
                "building_type": scenario["building_type"],
                "address_line1": scenario["address_line1"],
                "city": scenario["city"],
                "state": scenario["state"],
                "postal_code": scenario["postal_code"],
                "country": scenario["country"],
            },
        )

        # Step 2: keep the building deterministic across reruns
        dirty_fields: list[str] = []

        if building.building_type != scenario["building_type"]:
            building.building_type = scenario["building_type"]
            dirty_fields.append("building_type")

        if building.address_line1 != scenario["address_line1"]:
            building.address_line1 = scenario["address_line1"]
            dirty_fields.append("address_line1")

        if building.city != scenario["city"]:
            building.city = scenario["city"]
            dirty_fields.append("city")

        if building.state != scenario["state"]:
            building.state = scenario["state"]
            dirty_fields.append("state")

        if building.postal_code != scenario["postal_code"]:
            building.postal_code = scenario["postal_code"]
            dirty_fields.append("postal_code")

        if building.country != scenario["country"]:
            building.country = scenario["country"]
            dirty_fields.append("country")

        if dirty_fields:
            building.save(update_fields=dirty_fields)

        return building

    @staticmethod
    def _build_unit(
        *,
        organization: Organization,
        building: Building,
        scenario: dict[str, Any],
    ) -> Unit:
        """Create or reconcile one unit from a scenario definition.

        Args:
            organization: Target organization instance.
            building: Parent building instance.
            scenario: Unit scenario payload.

        Returns:
            Unit: Created or updated unit instance.
        """
        # Step 1: get or create by building + label
        unit, _ = Unit.objects.get_or_create(
            organization=organization,
            building=building,
            label=scenario["label"],
            defaults={
                "bedrooms": scenario["bedrooms"],
                "bathrooms": scenario["bathrooms"],
                "sqft": scenario["sqft"],
            },
        )

        # Step 2: keep the unit deterministic across reruns
        dirty_fields: list[str] = []

        if unit.organization_id != organization.id:
            unit.organization = organization
            dirty_fields.append("organization")

        if unit.building_id != building.id:
            unit.building = building
            dirty_fields.append("building")

        if unit.bedrooms != scenario["bedrooms"]:
            unit.bedrooms = scenario["bedrooms"]
            dirty_fields.append("bedrooms")

        if unit.bathrooms != scenario["bathrooms"]:
            unit.bathrooms = scenario["bathrooms"]
            dirty_fields.append("bathrooms")

        if unit.sqft != scenario["sqft"]:
            unit.sqft = scenario["sqft"]
            dirty_fields.append("sqft")

        if dirty_fields:
            unit.save(update_fields=dirty_fields)

        return unit