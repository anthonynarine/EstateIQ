// # Filename: src/features/leases/forms/UnitAssignmentSection.tsx


import { useMemo, useState } from "react";
import { Building2, Home, Lock } from "lucide-react";
import { useBuildingsQuery } from "../../buildings/pages/BuildingPage/hooks/useBuildings";
import { useUnitsQuery } from "../../buildings/pages/BuildingDetailPage/hooks/useUnitsQuery";



type Props = {
  orgSlug: string;
  initialBuildingId: number | null;
  initialUnitId: number | null;
  selectedBuildingId: number | null;
  selectedUnitId: number | null;
  onBuildingChange: (buildingId: number | null) => void;
  onUnitChange: (unitId: number | null) => void;
};

export default function UnitAssignmentSection({
  orgSlug,
  initialBuildingId,
  initialUnitId,
  selectedBuildingId,
  selectedUnitId,
  onBuildingChange,
  onUnitChange,
}: Props) {
  // Step 1: Local paging for lightweight dropdown population
  const [buildingPage] = useState(1);
  const [unitPage] = useState(1);
  const PAGE_SIZE = 100;

  const unitLocked = Boolean(initialUnitId);

  // Step 2: Resolve effective ids
  const effectiveBuildingId = initialBuildingId ?? selectedBuildingId ?? null;
  const effectiveUnitId = initialUnitId ?? selectedUnitId ?? null;

  // Step 3: Fetch buildings
  const buildingsQuery = useBuildingsQuery(orgSlug, buildingPage, PAGE_SIZE);

  // Step 4: Fetch units for the effective building
  const unitsQuery = useUnitsQuery({
    orgSlug,
    buildingId: effectiveBuildingId,
    page: unitPage,
    pageSize: PAGE_SIZE,
    enabled: Boolean(effectiveBuildingId),
  });

  const buildings = buildingsQuery.data?.results ?? [];
  const rawUnits = unitsQuery.data?.results ?? [];

  // Step 5: Prefer vacant units only in editable mode
  const availableUnits = useMemo(() => {
    return rawUnits.filter((unit) => !unit.is_occupied);
  }, [rawUnits]);

  // Step 6: Resolve display labels
  const selectedBuilding = useMemo(() => {
    return buildings.find((building) => building.id === effectiveBuildingId) ?? null;
  }, [buildings, effectiveBuildingId]);

  const selectedUnit = useMemo(() => {
    return rawUnits.find((unit) => unit.id === effectiveUnitId) ?? null;
  }, [rawUnits, effectiveUnitId]);

  const buildingPlaceholder = buildingsQuery.isLoading
    ? "Loading buildings..."
    : buildings.length === 0
      ? "No buildings found"
      : "Select building";

  const unitPlaceholder = !effectiveBuildingId
    ? "Choose building first"
    : unitsQuery.isLoading
      ? "Loading units..."
      : availableUnits.length === 0
        ? "No vacant units available"
        : "Select unit";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
          <Home className="h-5 w-5" />
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Unit assignment
          </p>

          <h3 className="text-base font-semibold text-white sm:text-lg">
            Building and Unit
          </h3>

          <p className="text-sm text-neutral-400">
            {unitLocked
              ? "This lease was launched from a specific unit, so assignment is locked."
              : "Select the building and vacant unit where this lease will be created."}
          </p>
        </div>
      </div>

      {unitLocked ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-medium text-neutral-200">Building</p>
              </div>

              <p className="mt-3 text-sm text-white">
                {selectedBuilding?.name ??
                  (initialBuildingId ? `Building #${initialBuildingId}` : "Building locked")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-medium text-neutral-200">Unit</p>
              </div>

              <p className="mt-3 text-sm text-white">
                {selectedUnit?.label ??
                  (initialUnitId ? `Unit #${initialUnitId}` : "Unit locked")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                This lease is being created from the unit workspace, so building and
                unit are fixed for this workflow.
              </p>
            </div>
          </div>

          {(buildingsQuery.isError || unitsQuery.isError) ? (
            <p className="text-xs text-red-300">
              Some assignment details could not be loaded. The lease can still proceed
              because the unit context is already fixed.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                <Building2 className="h-4 w-4 text-cyan-300" />
                Building
              </label>

              <select
                value={selectedBuildingId ?? ""}
                disabled={buildingsQuery.isLoading}
                onChange={(e) =>
                  onBuildingChange(e.target.value ? Number(e.target.value) : null)
                }
                className="
                  w-full rounded-xl border border-white/10 bg-neutral-950
                  px-3 py-2 text-sm text-white outline-none transition
                  focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-500/20
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <option value="">{buildingPlaceholder}</option>

                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>

              {buildingsQuery.isError ? (
                <p className="text-xs text-red-300">
                  Failed to load buildings for this organization.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                <Home className="h-4 w-4 text-cyan-300" />
                Unit
              </label>

              <select
                value={selectedUnitId ?? ""}
                disabled={
                  !selectedBuildingId ||
                  unitsQuery.isLoading ||
                  availableUnits.length === 0
                }
                onChange={(e) =>
                  onUnitChange(e.target.value ? Number(e.target.value) : null)
                }
                className="
                  w-full rounded-xl border border-white/10 bg-neutral-950
                  px-3 py-2 text-sm text-white outline-none transition
                  focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-500/20
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <option value="">{unitPlaceholder}</option>

                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>

              {selectedBuildingId && unitsQuery.isError ? (
                <p className="text-xs text-red-300">
                  Failed to load units for the selected building.
                </p>
              ) : null}
            </div>
          </div>

          {selectedBuildingId &&
          !unitsQuery.isLoading &&
          availableUnits.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-950/60 p-3 text-sm text-neutral-300">
              There are no vacant units available in this building.
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}