// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingUnitsSection.tsx
// ✅ New Code

import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;

  unitsCount: number;

  isAddOpen: boolean;
  onToggleAdd: () => void;

  addForm: ReactNode;

  isLoading: boolean;
  isError: boolean;
  emptyMessage?: string;

  renderUnits: () => ReactNode;
};

/**
 * BuildingUnitsSection
 *
 * UX goals:
 * - No redundant "Units: X" chip (that belongs in the building header summary).
 * - "Add Unit" control should visually match chips/badges used elsewhere.
 * - One click opens the inline form (no second nested panel).
 */
export default function BuildingUnitsSection({
  title = "Units",
  subtitle = "Click a unit to manage leases. Occupancy is computed from leases.",
  unitsCount,
  isAddOpen,
  onToggleAdd,
  addForm,
  isLoading,
  isError,
  emptyMessage = "No units yet. Add a unit under this building to get started.",
  renderUnits,
}: Props) {
  // Step 1: Loading/Error
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-neutral-300">Loading units…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-rose-300">
          Failed to load units. Please refresh and try again.
        </div>
      </div>
    );
  }

  // Step 2: Main UI
  return (
    <section>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
          </div>

          {/* ✅ Button styled to match your chips/badges */}
          <button
            type="button"
            onClick={onToggleAdd}
            className={[
              "inline-flex items-center gap-2",
              "rounded-full px-4 py-2",
              "text-xs font-medium text-neutral-100",
              "bg-white/5 ring-1 ring-white/10",
              "hover:bg-white/10 hover:ring-white/15",
              "active:bg-white/15",
            ].join(" ")}
          >
            <span className="text-sm leading-none">+</span>
            {isAddOpen ? "Cancel" : "Add unit"}
          </button>
        </div>

        {/* ✅ One click opens form */}
        {isAddOpen ? <div className="mt-5">{addForm}</div> : null}
      </div>

      {/* Step 3: Units list / empty */}
      <div className="mt-4">
        {unitsCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-neutral-300">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {renderUnits()}
          </div>
        )}
      </div>
    </section>
  );
}