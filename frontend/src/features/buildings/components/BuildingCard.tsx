// # Filename: src/features/buildings/components/BuildingCard.tsx
// ✅ New Code

import type { Building } from "../api/buildingsApi";

/**
 * BuildingCard
 *
 * Compact, responsive card:
 * - keeps mobile/tablet feeling “premium”
 * - avoids tall cards on desktop
 * - preserves clear hierarchy + action area
 */
export default function BuildingCard({ building }: { building: Building }) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">
            {building.name}
          </h3>

          <p className="mt-1 truncate text-sm text-white/70">
            {building.address_line1}
            {building.address_line2 ? `, ${building.address_line2}` : ""}
          </p>

          <p className="truncate text-sm text-white/60">
            {building.city}, {building.state} {building.postal_code}
          </p>
        </div>

        <div className="shrink-0 text-xs text-white/50">#{building.id}</div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:opacity-60"
          disabled
          title="Coming next: Building detail + units"
        >
          View units (next)
        </button>
      </div>
    </div>
  );
}