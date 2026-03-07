// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingsList.tsx
// ✅ New Code

import type { Building } from "../../../api/buildingsApi";
import BuildingCard from "./BuildingCard";

type Props = {
  buildings?: Building[];
  isLoading: boolean;
  isFetching: boolean;
  onEdit?: (building: Building) => void;
  onDelete?: (building: Building) => void;
};

/**
 * BuildingsList
 *
 * Premium workspace section for the buildings inventory.
 *
 * Responsibilities:
 * - Render loading / empty / populated states
 * - Frame the building cards inside a consistent workspace shell
 * - Surface portfolio inventory context
 *
 * Non-responsibilities:
 * - Fetching
 * - Sorting
 * - Building card actions/business logic
 */
export default function BuildingsList({
  buildings,
  isLoading,
  isFetching,
  onEdit,
  onDelete,
}: Props) {
  const safeBuildings = buildings ?? [];
  const buildingCount = safeBuildings.length;

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Building inventory
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Portfolio buildings
            </h2>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
            Loading buildings…
          </div>
        </div>
      </section>
    );
  }

  if (!buildingCount) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Building inventory
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Portfolio buildings
            </h2>
            <p className="text-sm text-neutral-400">
              Your portfolio starts here. Add buildings to organize units,
              leases, and occupancy.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-8 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <div className="text-sm font-medium text-white">
                No buildings yet
              </div>
              <p className="text-sm text-neutral-400">
                Create your first building to start organizing units, leases,
                and occupancy.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Building inventory
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Portfolio buildings
            </h2>
            <p className="text-sm text-neutral-400">
              {buildingCount} building{buildingCount === 1 ? "" : "s"} in this
              organization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {buildingCount} {buildingCount === 1 ? "building" : "buildings"}
            </span>

            {isFetching ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                Refreshing…
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {safeBuildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
}