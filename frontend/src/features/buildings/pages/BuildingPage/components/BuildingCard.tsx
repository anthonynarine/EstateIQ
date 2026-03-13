// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingCard.tsx


import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Pencil,
  Trash2,
  ArrowRight,
  Building2,
  MapPin,
  DoorOpen,
  Users,
  BedDouble,
} from "lucide-react";
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
 * - Display unit occupancy summary
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
      if (disableDelete) {
        return;
      }
      onDelete?.(building);
    },
    [building, disableDelete, onDelete]
  );

  const addressLine = [
    building.address_line1,
    building.address_line2,
  ]
    .filter(Boolean)
    .join(", ");

  const localityLine = [building.city, building.state, building.postal_code]
    .filter(Boolean)
    .join(", ")
    .replace(", ", ", ");

  const hasUnits = unitsCount > 0;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
                <Building2 className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-semibold tracking-tight text-white">
                  {building.name}
                </h3>

                <div className="mt-2 space-y-1">
                  {addressLine ? (
                    <div className="flex items-start gap-2 text-sm text-neutral-300">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                      <span className="truncate">{addressLine}</span>
                    </div>
                  ) : null}

                  {localityLine ? (
                    <p className="pl-6 text-sm text-neutral-400">{localityLine}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Summary rail */}
            {hasUnits ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="grid gap-0 sm:grid-cols-3">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="rounded-xl bg-white/5 p-2">
                      <DoorOpen className="h-4 w-4 text-neutral-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Units
                      </p>
                      <p className="text-sm font-semibold text-white">{unitsCount}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/8 sm:border-l sm:border-t-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="rounded-xl bg-emerald-400/10 p-2">
                        <Users className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                          Occupied
                        </p>
                        <p className="text-sm font-semibold text-emerald-300">
                          {occupiedCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/8 sm:border-l sm:border-t-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="rounded-xl bg-rose-400/10 p-2">
                        <BedDouble className="h-4 w-4 text-rose-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                          Vacant
                        </p>
                        <p className="text-sm font-semibold text-rose-300">
                          {vacantCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium text-neutral-200">No units added yet</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Add units to start tracking occupancy and lease activity.
                </p>
              </div>
            )}
          </div>
        </div>

        {(onEdit || onDelete) ? (
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

      <div className="mt-auto pt-5">
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="max-w-xl text-sm text-neutral-400">
              Open this building to manage units, tenants, and lease activity.
            </p>

            <button
              type="button"
              onClick={onViewUnits}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/8 hover:text-white"
            >
              View units
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}