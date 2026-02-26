
// # Filename: src/features/buildings/components/BuildingCard.tsx

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Building } from "../api/buildingsApi";

/**
 * BuildingCard
 *
 * Click-through card for a building record.
 *
 * Navigation rules:
 * - Route: /dashboard/buildings/:buildingId
 * - Preserve current URL query string (especially `?org=<slug>`),
 *   since org selection is URL-canonical in this app.
 */
export default function BuildingCard({ building }: { building: Building }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: Keep org selection stable by preserving ?org=<slug>
  const onViewUnits = useCallback(() => {
    navigate({
      pathname: `/dashboard/buildings/${building.id}`,
      search: location.search,
    });
  }, [building.id, location.search, navigate]);

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
          onClick={onViewUnits}
          className="rounded-xl border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
        >
          View units
        </button>
      </div>
    </div>
  );
}