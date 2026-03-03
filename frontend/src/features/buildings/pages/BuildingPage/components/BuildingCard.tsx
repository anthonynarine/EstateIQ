// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingCard.tsx


import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import type { Building } from "../../../api/buildingsApi";

type Props = {
  building: Building;

  //optional actions
  onEdit?: (building: Building) => void;
  onDelete?: (building: Building) => void;

  // allow parent to disable delete if needed
  disableDelete?: boolean;
};

/**
 * BuildingCard
 *
 * Presentational + navigation card for a Building record.
 *
 * Responsibilities:
 * - Display building address + summary counts (units/occupied/vacant)
 * - Provide "View units" navigation
 * - Provide optional edit/delete icon actions (delegated to parent orchestration)
 *
 * Non-responsibilities:
 * - No data fetching
 * - No mutation calls
 * - No org scoping logic
 */
export default function BuildingCard({
  building,
  onEdit,
  onDelete,
  disableDelete = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: Pull summary counts from API (safe defaults for old cached shapes)
  const summary = building as Building & {
    units_count?: number;
    occupied_units_count?: number;
    vacant_units_count?: number;
  };

  const unitsCount = summary.units_count ?? 0;
  const occupiedCount = summary.occupied_units_count ?? 0;
  const vacantCount =
    summary.vacant_units_count ?? Math.max(0, unitsCount - occupiedCount);

  // Step 2: Keep org selection stable by preserving ?org=<slug>
  const onViewUnits = useCallback(() => {
    navigate({
      pathname: `/dashboard/buildings/${building.id}`,
      search: location.search,
      // Step 2b: Pass a snapshot so the detail page can render address instantly.
      // NOTE: Route state is not persisted on refresh.
      state: { building },
    });
  }, [building, location.search, navigate]);

  // icon handlers
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(building);
    },
    [building, onEdit]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disableDelete) return;
      onDelete?.(building);
    },
    [building, disableDelete, onDelete]
  );

  // Step 3: Chip component (matches Unit chips more closely)
  const Chip = ({
    label,
    value,
    variant = "neutral",
  }: {
    label: string;
    value: number;
    variant?: "neutral" | "occupied" | "vacant";
  }) => {
    const base =
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border";

    const styles: Record<typeof variant, string> = {
      neutral: "border-white/10 bg-white/5 text-white/80",
      occupied: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
      vacant: "border-red-400/25 bg-red-500/10 text-red-200",
    };

    return (
      <span className={`${base} ${styles[variant]}`}>
        {label}: <span className="ml-1 text-white">{value}</span>
      </span>
    );
  };

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

          {/* Step 4: Summary chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {unitsCount === 0 ? (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                No units added
              </span>
            ) : (
              <>
                <Chip label="Units" value={unitsCount} variant="neutral" />
                <Chip label="Occupied" value={occupiedCount} variant="occupied" />
                <Chip label="Vacant" value={vacantCount} variant="vacant" />
              </>
            )}
          </div>
        </div>

        {/* icon actions (top-right) */}
        {onEdit || onDelete ? (
          <div className="flex items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                title="Edit building"
              >
                <Pencil className="h-4 w-4 text-neutral-200" />
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={disableDelete}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                ].join(" ")}
                title={
                  disableDelete
                    ? "Cannot delete this building right now."
                    : "Delete building"
                }
              >
                <Trash2 className="h-4 w-4 text-neutral-200" />
              </button>
            ) : null}
          </div>
        ) : null}
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