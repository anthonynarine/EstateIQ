// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx


import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useOrg } from "../../../tenancy/hooks/useOrg";
import { useBuildingQuery } from "../BuildingPage/hooks/useBuildings";
import { useUnitsQuery } from "./hooks/useUnitsQuery";
import { useUnitActions } from "./hooks/useUnitActions";

import BuildingDetailHeader from "./components/BuildingDetailHeader";
import BuildingUnitsSection from "./components/BuildingUnitsSection";
import UnitCard from "./components/UnitCard";

import CreateUnitForm from "./forms/CreateUnitForm";
import UnitEditModal from "./forms/UnitEditModal";
import UnitDeleteConfirmModal from "./forms/UnitDeleteConfirmModal";

/**
 * BuildingDetailPage
 *
 * Orchestrator page for a single building:
 * - Fetch building + units (org-scoped)
 * - Render header + units grid
 * - Occupancy is computed server-side (NO per-unit lease queries)
 * - Delegate edit/delete to `useUnitActions` (modals are presentational)
 */
export default function BuildingDetailPage() {
  // Step 1: Routing + org context
  const { buildingId } = useParams<{ buildingId: string }>();
  const { orgSlug } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  const buildingIdNumber = Number(buildingId);
  const canQuery = Boolean(orgSlug) && Number.isFinite(buildingIdNumber);

  // Step 2: Local UI state
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  // Step 3: Queries (org-scoped)
  const {
    data: building,
    isLoading: buildingLoading,
    isError: buildingIsError,
  } = useBuildingQuery(orgSlug, buildingIdNumber, canQuery);

  const {
    data: units = [],
    isLoading: unitsLoading,
    isError: unitsIsError,
  } = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
    enabled: canQuery,
  });

  // Step 4: Derived building header fields (stable)
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

  // Step 5: Derived occupancy counts (deterministic; no "Checking..." state)
  const occupiedUnitsCount = useMemo(() => {
    return units.filter((u) => u.is_occupied).length;
  }, [units]);

  // Step 6: Unit actions (edit/delete modals)
  const { openEdit, openDelete, editModalProps, deleteModalProps } =
    useUnitActions(buildingIdNumber);

  // Step 7: Navigate to unit detail page (preserve org querystring)
  const goToUnit = (unit: { id: number; label: string }) => {
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
        Missing organization context or invalid building id.
      </div>
    );
  }

  if (buildingLoading) {
    return <div className="p-6 text-neutral-300">Loading building…</div>;
  }

  if (buildingIsError || !building || !buildingForHeader) {
    return <div className="p-6 text-rose-300">Failed to load building.</div>;
  }

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
        isError={unitsIsError}
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
          units.map((u) => (
            <UnitCard
              key={u.id}
              unit={u}
              isOccupied={u.is_occupied}
              onOpen={() => goToUnit({ id: u.id, label: u.label })}
              onEdit={() => openEdit(u)}
              onDelete={() => openDelete(u)}
            />
          ))
        }
      />

      {/* Step 9: Edit modal */}
      <UnitEditModal
        isOpen={editModalProps.isOpen}
        unitDisplayName={editModalProps.unitDisplayName}
        value={editModalProps.value}
        onChange={editModalProps.onChange}
        onClose={editModalProps.onClose}
        onSubmit={editModalProps.onSubmit}
        isSaving={editModalProps.isSaving}
        errorMessage={editModalProps.errorMessage ?? null}
      />

      {/* Step 10: Delete modal */}
      <UnitDeleteConfirmModal {...deleteModalProps} />
    </div>
  );
}