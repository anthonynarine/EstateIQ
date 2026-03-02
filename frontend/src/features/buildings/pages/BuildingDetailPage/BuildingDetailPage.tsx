// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOrg } from "../../../tenancy/hooks/useOrg";

import { useBuildingQuery } from "../../queries/useBuildings";
import { useUnitsQuery } from "../../queries/useUnitsQuery";
import { useBuildingOccupancyByUnitId } from "./hooks/useBuildingOccupancyByUnitID";

import BuildingDetailHeader from "./components/BuildingDetailHeader";
import BuildingUnitsSection from "./components/BuildingUnitsSection";
import UnitCard from "./components/UnitCard";

import CreateUnitForm from "./forms/CreateUnitForm";

/**
 * BuildingDetailPage
 *
 * Orchestrator for the building detail view.
 */
export default function BuildingDetailPage() {
  // Step 1: Routing + org
  const { buildingId } = useParams<{ buildingId: string }>();
  const { orgSlug } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ New Code: single dropdown state
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  const buildingIdNumber = Number(buildingId);
  const canQuery = Number.isFinite(buildingIdNumber) && !!orgSlug;

  // Step 2: Fetch building
  const {
    data: building,
    isLoading: buildingLoading,
    isError: buildingError,
  } = useBuildingQuery(orgSlug, buildingIdNumber, canQuery);

  // Step 3: Fetch units
  const {
    data: units = [],
    isLoading: unitsLoading,
    isError: unitsError,
  } = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
    enabled: canQuery,
  });

  // Step 4: Header snapshot
  const buildingForHeader = useMemo(() => {
    if (!building) return null;

    return {
      name: building.name,
      address_line1: building.address_line1,
      address_line2: building.address_line2 ?? null,
      city: building.city,
      state: building.state,
      postal_code: building.postal_code,
    };
  }, [building]);

  // Step 5: Occupancy map
  const { occupancyByUnitId, leasesResults } = useBuildingOccupancyByUnitId({
    orgSlug,
    units,
  });

  // Step 6: Derived counts
  const occupiedUnitsCount = useMemo(() => {
    return units.filter((u) => occupancyByUnitId[u.id]).length;
  }, [units, occupancyByUnitId]);

  // Step 7: Navigation
  const goToUnit = (unit: { id: number; label: string | null }) => {
    const search = location.search || "";

    navigate(`/dashboard/units/${unit.id}${search}`, {
      state: {
        building: buildingForHeader,
        unit: { id: unit.id, label: unit.label },
      },
    });
  };

  // Step 8: Guards
  if (!canQuery) {
    return (
      <div className="p-6 text-rose-300">
        Missing org or invalid building id.
      </div>
    );
  }

  if (buildingLoading) {
    return <div className="p-6 text-neutral-300">Loading building…</div>;
  }

  if (buildingError || !building || !buildingForHeader) {
    return <div className="p-6 text-rose-300">Failed to load building.</div>;
  }

  // Step 9: Render
  return (
    <div className="space-y-6">
      <BuildingDetailHeader
        orgSlug={orgSlug}
        building={buildingForHeader}
        occupiedUnitsCount={occupiedUnitsCount}
        totalUnitsCount={units.length}
      />

      <BuildingUnitsSection
        isLoading={unitsLoading}
        isError={unitsError}
        unitsCount={units.length}
        isAddOpen={isAddUnitOpen}
        onToggleAdd={() => setIsAddUnitOpen((p) => !p)}
        addForm={
          <CreateUnitForm
            orgSlug={orgSlug}
            buildingId={buildingIdNumber}
            variant="inline" // ✅ CRITICAL: removes the second panel + second Add button
            onSuccess={() => setIsAddUnitOpen(false)}
            onCancel={() => setIsAddUnitOpen(false)}
          />
        }
        renderUnits={() =>
          units.map((u) => {
            const leasesResult = leasesResults.find((r) => r.unitId === u.id);

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
                isOccupied={occupancyByUnitId[u.id] ?? false}
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