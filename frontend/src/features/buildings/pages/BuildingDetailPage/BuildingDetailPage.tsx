// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOrg } from "../../../tenancy/hooks/useOrg";
import { useBuildingQuery } from "../BuildingPage/hooks/useBuildings";
import { useUnitsQuery } from "./hooks/useUnitsQuery";
import { useBuildingOccupancyByUnitId } from "./hooks/useBuildingOccupancyByUnitID";
import BuildingDetailHeader from "./components/BuildingDetailHeader";
import BuildingUnitsSection from "./components/BuildingUnitsSection";
import UnitCard from "./components/UnitCard";
import CreateUnitForm from "./forms/CreateUnitForm";
import useUnitActions from "./hooks/useUnitActions";
import UnitEditModal from "./forms/UnitEditModal";
import UnitDeleteConfirmModal from "./forms/UnitDeleteConfirmModal";

type UnitForUi = {
  id: number;
  label: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
};

/**
 * BuildingDetailPage
 *
 * Orchestrator-only page for Building detail.
 *
 * Responsibilities:
 * - Fetch building + units
 * - Compute occupancy snapshot
 * - Render header + units section + unit cards
 * - Own "Add unit" open state only
 * - Delegate edit/delete flows to `useUnitActions`
 */
export default function BuildingDetailPage() {
  // Step 1: Routing + org
  const { buildingId } = useParams<{ buildingId: string }>();
  const { orgSlug } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  const buildingIdNumber = Number(buildingId);
  const canQuery = Number.isFinite(buildingIdNumber) && !!orgSlug;

  // Step 2: UI state (Add Unit only)
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  // Step 3: Queries
  const {
    data: building,
    isLoading: buildingLoading,
    isError: buildingError,
  } = useBuildingQuery(orgSlug, buildingIdNumber, canQuery);

  const {
    data: units = [],
    isLoading: unitsLoading,
    isError: unitsError,
  } = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
    enabled: canQuery,
  });

  // Step 4: Occupancy map
  const { occupancyByUnitId, leasesResults } = useBuildingOccupancyByUnitId({
    orgSlug,
    units,
  });

  // Step 5: Header snapshot (stable)
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

  const occupiedUnitsCount = useMemo(() => {
    return units.filter((u) => occupancyByUnitId[u.id]).length;
  }, [units, occupancyByUnitId]);

  // Step 6: Unit actions hook (edit/delete orchestration)
  const { openEdit, openDelete, editModalProps, deleteModalProps } =
    useUnitActions(buildingIdNumber);

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
      <div className="p-6 text-rose-300">Missing org or invalid building id.</div>
    );
  }

  if (buildingLoading) {
    return <div className="p-6 text-neutral-300">Loading building…</div>;
  }

  if (buildingError || !building || !buildingForHeader) {
    return <div className="p-6 text-rose-300">Failed to load building.</div>;
  }

  // Step 9: Normalize units for UI
  const unitsForUi: UnitForUi[] = units.map((u) => ({
    id: u.id,
    label: u.label ?? null,
    bedrooms: u.bedrooms ?? null,
    bathrooms: u.bathrooms ?? null,
    sqft: (u as any).sqft ?? (u as any).square_feet ?? null,
  }));

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
            variant="inline"
            onSuccess={() => setIsAddUnitOpen(false)}
            onCancel={() => setIsAddUnitOpen(false)}
          />
        }
        renderUnits={() =>
          unitsForUi.map((u) => {
            const leasesResult = leasesResults.find((r) => r.unitId === u.id);

            return (
              <UnitCard
                key={u.id}
                unit={u}
                isOccupied={occupancyByUnitId[u.id] ?? false}
                leasesLoading={leasesResult?.isLoading ?? false}
                onOpen={() => goToUnit({ id: u.id, label: u.label })}
                // ✅ New Code
                onEdit={() => openEdit(u)}
                onDelete={() => openDelete(u)}
              />
            );
          })
        }
      />

      {/* Modals are rendered here, but state/logic lives in the hook */}
      <UnitEditModal {...editModalProps} />
      <UnitDeleteConfirmModal {...deleteModalProps} />
    </div>
  );
}