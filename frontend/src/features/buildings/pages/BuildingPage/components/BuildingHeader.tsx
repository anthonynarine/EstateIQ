// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingHeader.tsx
// ✅ New Code

import { Building2, Plus } from "lucide-react";

type Props = {
  orgSlug: string | null;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
};

/**
 * BuildingHeader
 *
 * Premium mobile-first header for the Buildings page.
 *
 * Responsibilities:
 * - Show page identity
 * - Provide create toggle
 *
 * Non-responsibilities:
 * - No fetching
 * - No mutation logic
 */
export default function BuildingHeader({
  orgSlug: _orgSlug,
  isCreateOpen,
  onToggleCreate,
}: Props) {
  return (
    <header className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 shadow-[0_0_0_1px_rgba(255,255,255,0.015)]">
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Portfolio workspace
                </p>

                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Buildings
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-neutral-400">
                  Manage properties at the building level, then drill into
                  units, leases, and occupancy from each building workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-stretch lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={onToggleCreate}
              className={[
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition sm:w-auto",
                isCreateOpen
                  ? "border-white/10 bg-white/[0.03] text-neutral-200 hover:bg-white/[0.06]"
                  : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300/30 hover:bg-cyan-500/15",
              ].join(" ")}
            >
              {isCreateOpen ? null : <Plus className="h-4 w-4" />}
              <span>{isCreateOpen ? "Close form" : "Add building"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}