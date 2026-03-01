// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx


import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOrg } from "../../../tenancy/hooks/useOrg";

import { useBuildingQuery } from "../../queries/useBuildings";
import { useUnitsQuery } from "../../queries/useUnitsQuery";
import { useBuildingOccupancyByUnitId}  from "../BuildingDetailPage/hooks/useBuildingOccupancyByUnitID"
import BuildingDetailHeader from "./components/BuildingDetailHeader";
import BuildingUnitSection from "./components/BuildingUnitsSection";
import UnitCard from "./components/UnitCard";

/**
 * BuildingDetailPage
 *
 * Orchestrator for the building detail view.
 *
 * Responsibilities:
 * - Resolve route + org context
 * - Fetch building + units
 * - Compose occupancy data via hook
 * - Pass all computed data into child components
 *
 * Non-responsibilities:
 * - No heavy UI rendering
 * - No inline unit cards
 * - No formatting logic
 */
export default function BuildingDetailPage() {
  // Step 1: Routing + Org
  const { buildingId } = useParams<{ buildingId: string }>();
  const { orgSlug } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  const buildingIdNumber = Number(buildingId);

  // Step 2: Queries
const {
  data: building,
  isLoading: buildingLoading,
  isError: buildingError,
} = useBuildingQuery(orgSlug, buildingIdNumber, Number.isFinite(buildingIdNumber));

  const {
    data: units = [],
    isLoading: unitsLoading,
    isError: unitsError,
  } = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
  });

  // Step 3: Occupancy composition
  const {
    occupancyByUnitId,
    leasesResults,
  } = useBuildingOccupancyByUnitId({
    orgSlug,
    units,
  });

  // Step 4: Derived counts
  const occupiedUnitsCount = useMemo(() => {
    return units.filter((u) => occupancyByUnitId[u.id]).length;
  }, [units, occupancyByUnitId]);

  // Step 5: Safe header model
  const buildingForHeader = building
    ? {
        name: building.name,
        address_line1: building.address_line1,
        address_line2: building.address_line2 ?? null,
        city: building.city,
        state: building.state,
        postal_code: building.postal_code,
      }
    : null;

  // Step 6: Navigation (passes snapshot for Unit header fix)
  const goToUnit = (unit: { id: number; label: string | null }) => {
    const search = location.search || "";

    navigate(`/dashboard/units/${unit.id}${search}`, {
      state: {
        building: buildingForHeader,
        unit: {
          id: unit.id,
          label: unit.label,
        },
      },
    });
  };

  // Step 7: Early guards
  if (buildingLoading) {
    return <div className="p-6 text-neutral-300">Loading building…</div>;
  }

  if (buildingError || !building) {
    return (
      <div className="p-6 text-rose-300">
        Failed to load building.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <BuildingDetailHeader
        orgSlug={orgSlug}
        building={buildingForHeader!}
        occupiedUnitsCount={occupiedUnitsCount}
        totalUnitsCount={units.length}
        isLoading={buildingLoading}
      />

      {/* Units Section */}
      <BuildingUnitSection
        isLoading={unitsLoading}
        isError={unitsError}
        unitsCount={units.length}
        renderUnits={() =>
          units.map((u) => {
            const leasesResult = leasesResults.find(
              (r) => r.unitId === u.id
            );

            const isOccupied = occupancyByUnitId[u.id] ?? false;

            return (
              <UnitCard
                key={u.id}
                unit={{
                  id: u.id,
                  label: u.label ?? null,
                  bedrooms: u.bedrooms ?? null,
                  bathrooms: u.bathrooms ?? null,
                  sqft: u.sqft ?? null,
                }}
                isOccupied={isOccupied}
                leasesLoading={leasesResult?.isLoading ?? false}
                onOpen={(unit) => goToUnit(unit)}
              />
            );
          })
        }
      />
    </div>
  );
}