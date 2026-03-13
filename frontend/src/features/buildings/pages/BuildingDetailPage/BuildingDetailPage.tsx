// # Filename: src/features/buildings/pages/BuildingDetailPage/BuildingDetailPage.tsx

import { useEffect, useMemo, useState } from "react";
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
import CollectionPaginationFooter from "../../../../components/pagination/CollectionPaginationFooter";

/**
 * BuildingDetailPage
 *
 * Orchestrator page for a single building:
 * - Fetch building + paginated units (org-scoped)
 * - Render header + units grid
 * - Occupancy is computed server-side
 * - Active tenant / lease summary is returned flat from the units API
 * - Delegate edit/delete to `useUnitActions`
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
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 4;

  // Step 3: Building query
  const {
    data: building,
    isLoading: buildingLoading,
    isError: buildingIsError,
  } = useBuildingQuery(orgSlug, buildingIdNumber, canQuery);

  // Step 4: Units query (paginated)
  const unitsQuery = useUnitsQuery({
    orgSlug,
    buildingId: buildingIdNumber,
    page,
    pageSize: PAGE_SIZE,
    enabled: canQuery,
  });

  const pageData = unitsQuery.data;
  const units = pageData?.results ?? [];
  const totalCount = pageData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  console.log("BuildingDetailPage units:", units);


  // Step 5: Clamp page if deletes or mutations reduce the page count
  useEffect(() => {
    if (!unitsQuery.isSuccess) {
      return;
    }

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, unitsQuery.isSuccess]);

  // Step 6: Derived building header fields
  const buildingForHeader = useMemo(() => {
    if (!building) {
      return null;
    }

    return {
      name: building.name,
      address_line1: building.address_line1,
      address_line2: building.address_line2 ?? null,
      city: building.city,
      state: building.state,
      postal_code: building.postal_code,
    };
  }, [building]);

  // Step 7: Occupancy count for currently loaded units
  const occupiedUnitsCount = useMemo(() => {
    return units.filter((u) => u.is_occupied).length;
  }, [units]);

  // Step 8: Unit actions (edit/delete modals)
  const { openEdit, openDelete, editModalProps, deleteModalProps } =
    useUnitActions(buildingIdNumber);

  // Step 9: Navigate to unit detail page
  const goToUnit = (unit: { id: number; label: string }) => {
    const search = location.search || "";

    navigate(`/dashboard/units/${unit.id}${search}`, {
      state: {
        building: buildingForHeader,
        unit: { id: unit.id, label: unit.label },
      },
    });
  };

  // Step 10: Navigate to tenant detail page
  const goToTenant = (tenantId: number) => {
    const search = location.search || "";
    navigate(`/dashboard/tenants/${tenantId}${search}`);
  };

  // Step 11: Guards
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
        totalUnitsCount={totalCount}
      />

      <BuildingUnitsSection
        isLoading={unitsQuery.isLoading}
        isError={unitsQuery.isError}
        unitsCount={units.length}
        isAddOpen={isAddUnitOpen}
        onToggleAdd={() => setIsAddUnitOpen((prev) => !prev)}
        addForm={
          <CreateUnitForm
            orgSlug={orgSlug}
            buildingId={buildingIdNumber}
            variant="inline"
            onSuccess={() => {
              setIsAddUnitOpen(false);
              setPage(1);
            }}
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
              onOpenTenant={
                u.active_tenant_id ? () => goToTenant(u.active_tenant_id) : undefined
              }
              onEdit={() => openEdit(u)}
              onDelete={() => openDelete(u)}
            />
          ))
        }
        footer={
          <CollectionPaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            itemLabel="unit"
            isFetching={unitsQuery.isFetching}
            onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        }
      />

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

      <UnitDeleteConfirmModal {...deleteModalProps} />
    </div>
  );
}