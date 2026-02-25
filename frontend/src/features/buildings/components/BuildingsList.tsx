// # Filename: src/features/buildings/components/BuildingsList.tsx
// ✅ New Code

import type { Building } from "../api/buildingsApi";
import BuildingCard from "./BuildingCard";

type Props = {
  buildings?: Building[]; // ✅ allow undefined safely
  isLoading: boolean;
  isFetching: boolean;
};

export default function BuildingsList({ buildings, isLoading, isFetching }: Props) {
  // Step 1: Normalize to safe array
  const safeBuildings = buildings ?? [];

  // Step 2: Loading state (first load)
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/70">Loading buildings…</p>
      </div>
    );
  }

  // Step 3: Empty state (loaded but none)
  if (!safeBuildings.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/70">
          No buildings yet. Create your first one.
        </p>
      </div>
    );
  }

  // Step 4: List state (auto-fit grid so cards expand on large screens)
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          {safeBuildings.length} building{safeBuildings.length === 1 ? "" : "s"}
        </p>

        {isFetching ? (
          <span className="text-xs text-white/40">Refreshing…</span>
        ) : null}
      </div>

      {/* 
        ✅ Auto-fit + minmax:
        - Cards are at least 420px wide
        - They grow to fill space
        - Columns increase naturally on wider screens
      */}
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
        {safeBuildings.map((b) => (
          <BuildingCard key={b.id} building={b} />
        ))}
      </div>
    </section>
  );
}