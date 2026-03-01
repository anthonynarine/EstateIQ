// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingUnitSection.tsx

import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  unitsCount: number;
  renderUnits: () => ReactNode;
};

/**
 * BuildingUnitSection
 *
 * UI section wrapper for the Units area on BuildingDetailPage.
 *
 * Responsibilities:
 * - Render a section header (title/subtitle).
 * - Render actions area (e.g., refresh button).
 * - Provide standard loading/error/empty states.
 * - Render additional content above the list via `children` (e.g., Add Unit form).
 * - Render the unit list via `renderUnits()` to keep the section generic.
 *
 * Non-responsibilities:
 * - Does NOT fetch data.
 * - Does NOT compute occupancy.
 * - Does NOT know unit types; it only renders what the caller provides.
 */
export default function BuildingUnitSection({
  title = "Units",
  subtitle = "Click a unit to manage leases. Occupancy is computed from leases.",
  actions,
  isLoading,
  isError,
  emptyMessage = "No units yet. Add units under this building to get started.",
  children,
  unitsCount,
  renderUnits,
}: Props) {
  // Step 1: Standard status rendering
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

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-neutral-400">{subtitle}</p>
          </div>

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      {children ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {children}
        </div>
      ) : null}

      {unitsCount === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-neutral-300">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {renderUnits()}
        </div>
      )}
    </section>
  );
}