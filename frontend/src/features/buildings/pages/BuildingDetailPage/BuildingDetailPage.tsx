// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useOrg } from "../../../tenancy/hooks/useOrg";
import { useBuildingQuery } from "../BuildingPage/hooks/useBuildings";
import { useUnitsQuery } from "./hooks/useUnitsQuery";
import BuildingDetailHeader from "./components/BuildingDetailHeader";
import BuildingUnitsSection from "./components/BuildingUnitsSection";
import UnitCard from "./components/UnitCard";
import CreateUnitForm from "./forms/CreateUnitForm";
import { useUnitActions } from "./hooks/useUnitActions";
import UnitEditModal from "./forms/UnitEditModal";
import UnitDeleteConfirmModal from "./forms/UnitDeleteConfirmModal";
import type { Lease } from "../../../leases/api/leaseApi";
import { listLeasesByUnit } from "../../../leases/api/leaseApi";
import { leasesByUnitQueryKey } from "../../../leases/queries/useLeasesByUnitQuery";
import { getTodayISO, getUnitOccupancyStatus } from "../../../leases/utils/occupancy";

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
 * Orchestrator page for a single building:
 * - Fetch building + units (org-scoped)
 * - Compute occupancy per unit from lease truth (deterministic rule)
 * - Render header + units grid
 * - Keep add-unit UI state local
 * - Delegate edit/delete to `useUnitActions` (modals are presentational)
 *
 * Why lease-driven occupancy:
 * - Avoids the old "fetchUnitOccupancy not provided" hook failure
 * - Guarantees BuildingDetailPage matches Unit detail page occupancy
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

  // Step 4: Normalize units for UI (stable shape)
  const unitsForUi: UnitForUi[] = useMemo(
    () =>
      units.map((u) => ({
        id: u.id,
        label: u.label ?? null,
        bedrooms: u.bedrooms ?? null,
        bathrooms: u.bathrooms ?? null,
        sqft: (u as any).sqft ?? (u as any).square_feet ?? null,
      })),
    [units]
  );

  // Step 5: Building header snapshot
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

  // Step 6: Lease-driven occupancy (source of truth)
  const todayISO = useMemo(() => getTodayISO(), []);

  const leaseQueries = useQueries({
    queries: (canQuery ? unitsForUi : []).map((u) => ({
      queryKey: leasesByUnitQueryKey(orgSlug as string, u.id),
      queryFn: async () => {
        const leases = await listLeasesByUnit(u.id);
        return Array.isArray(leases) ? (leases as Lease[]) : [];
      },
      enabled: canQuery && Number.isFinite(u.id),
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  const occupancyByUnitId = useMemo(() => {
    const map: Record<number, boolean> = {};

    unitsForUi.forEach((u, idx) => {
      const q = leaseQueries[idx];
      const leases = (q?.data ?? []) as Lease[];
      map[u.id] = getUnitOccupancyStatus(leases, todayISO) === "occupied";
    });

    return map;
  }, [leaseQueries, todayISO, unitsForUi]);

  const occupiedUnitsCount = useMemo(() => {
    return unitsForUi.filter((u) => occupancyByUnitId[u.id]).length;
  }, [unitsForUi, occupancyByUnitId]);

  // Step 7: Unit edit/delete actions (modals)
  const { openEdit, openDelete, editModalProps, deleteModalProps } =
    useUnitActions(buildingIdNumber);

  // Step 8: Navigation
  const goToUnit = (unit: { id: number; label: string | null }) => {
    const search = location.search || "";

    navigate(`/dashboard/units/${unit.id}${search}`, {
      state: {
        building: buildingForHeader,
        unit: { id: unit.id, label: unit.label },
      },
    });
  };

  // Step 9: Guards
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

  return (
    <div className="space-y-6">
      <BuildingDetailHeader
        orgSlug={orgSlug}
        building={buildingForHeader}
        occupiedUnitsCount={occupiedUnitsCount}
        totalUnitsCount={unitsForUi.length}
      />

      <BuildingUnitsSection
        isLoading={unitsLoading}
        isError={unitsError}
        unitsCount={unitsForUi.length}
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
          unitsForUi.map((u) => (
            <UnitCard
              key={u.id}
              unit={u}
              isOccupied={occupancyByUnitId[u.id] ?? false}
              onOpen={() => goToUnit({ id: u.id, label: u.label })}
              onEdit={() => openEdit(u)}
              onDelete={() => openDelete(u)}
            />
          ))
        }
      />

      {/* errorMessage is REQUIRED in its Props, so pass explicitly */}
      <UnitEditModal
        isOpen={editModalProps.isOpen}
        unitDisplayName={editModalProps.unitDisplayName}
        value={editModalProps.value}
        isSaving={editModalProps.isSaving}
        errorMessage={editModalProps.errorMessage ?? null}
        onClose={editModalProps.onClose}
        onSubmit={editModalProps.onSubmit}
        onChange={(next) => editModalProps.onChange(next)}
      />

      <UnitDeleteConfirmModal {...deleteModalProps} />
    </div>
  );
}