// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingUnitsSection.tsx


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
 * Premium workspace shell for the units area of a building.
 *
 * Responsibilities:
 * - Render the section header and action area
 * - Toggle inline unit creation form
 * - Render loading / error / empty states
 * - Render the unit grid via `renderUnits`
 *
 * Non-responsibilities:
 * - Fetching data
 * - Unit mutation logic
 * - Card-level unit presentation
 */
export default function BuildingUnitsSection({
  title = "Units",
  subtitle = "Manage the units in this building. Occupancy is derived from active leases.",
  unitsCount,
  isAddOpen,
  onToggleAdd,
  addForm,
  isLoading,
  isError,
  emptyMessage = "No units yet. Add the first unit under this building to get started.",
  renderUnits,
}: Props) {
  // Step 1: Loading state
  if (isLoading) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
            Loading units…
          </div>
        </div>
      </section>
    );
  }

  // Step 2: Error state
  if (isError) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-300">
            Failed to load units. Please refresh and try again.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Unit workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm text-neutral-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {unitsCount} {unitsCount === 1 ? "unit" : "units"}
            </span>

            <button
              type="button"
              onClick={onToggleAdd}
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2.5",
                "text-sm font-medium transition",
                isAddOpen
                  ? "border border-white/10 bg-white/[0.03] text-neutral-200 hover:bg-white/[0.06]"
                  : "border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300/30 hover:bg-cyan-500/15",
              ].join(" ")}
              >
              <span className="text-base leading-none">{isAddOpen ? "×" : "+"}</span>
              {isAddOpen ? "Close form" : "Add unit"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {isAddOpen ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4 sm:p-5">
            {addForm}
          </div>
        ) : null}

        {unitsCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-8 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <div className="text-sm font-medium text-white">No units yet</div>
              <p className="text-sm text-neutral-400">{emptyMessage}</p>
              {!isAddOpen ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onToggleAdd}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Create first unit
                  </button>
                </div>
              ) : null}
            </div>
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