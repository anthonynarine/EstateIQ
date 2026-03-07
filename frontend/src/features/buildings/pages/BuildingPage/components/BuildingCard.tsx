// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingCard.tsx
// ✅ New Code

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import type { Building } from "../../../api/buildingsApi";

type Props = {
  building: Building;
  onEdit?: (building: Building) => void;
  onDelete?: (building: Building) => void;
  disableDelete?: boolean;
};

/**
 * BuildingCard
 *
 * Presentational + navigation card for a Building record.
 *
 * Responsibilities:
 * - Display building identity and address
 * - Display summary chips
 * - Navigate to the building detail workspace
 * - Delegate edit/delete actions to parent orchestration
 */
export default function BuildingCard({
  building,
  onEdit,
  onDelete,
  disableDelete = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const summary = building as Building & {
    units_count?: number;
    occupied_units_count?: number;
    vacant_units_count?: number;
  };

  const unitsCount = summary.units_count ?? 0;
  const occupiedCount = summary.occupied_units_count ?? 0;
  const vacantCount =
    summary.vacant_units_count ?? Math.max(0, unitsCount - occupiedCount);

  const onViewUnits = useCallback(() => {
    navigate({
      pathname: `/dashboard/buildings/${building.id}`,
      search: location.search,
      state: { building },
    });
  }, [building, location.search, navigate]);

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
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1";

    const styles: Record<typeof variant, string> = {
      neutral: "bg-white/5 text-neutral-200 ring-white/10",
      occupied: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
      vacant: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    };

    return (
      <span className={`${base} ${styles[variant]}`}>
        {label}: <span className="ml-1 text-white">{value}</span>
      </span>
    );
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <h3 className="truncate text-xl font-semibold tracking-tight text-white">
              {building.name}
            </h3>

            <p className="truncate text-sm text-neutral-300">
              {building.address_line1}
              {building.address_line2 ? `, ${building.address_line2}` : ""}
            </p>

            <p className="truncate text-sm text-neutral-400">
              {building.city}, {building.state} {building.postal_code}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {unitsCount === 0 ? (
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-200 ring-1 ring-white/10">
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

        {onEdit || onDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-neutral-400">
            Open this building to manage units and lease activity.
          </p>

          <button
            type="button"
            onClick={onViewUnits}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-neutral-100 transition hover:text-white"
          >
            View units
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}