// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingCard.tsx
// ✅ New Code

import { useCallback, type MouseEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  DoorOpen,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import type { Building } from "../../../api/buildingsApi";

type Props = {
  building: Building;
  onEdit?: (building: Building) => void;
  onDelete?: (building: Building) => void;
  disableDelete?: boolean;
};

type SummaryItemProps = {
  icon: ReactNode;
  label: string;
  value: number;
  valueClassName?: string;
  iconWrapperClassName?: string;
};

type BuildingWithSummary = Building & {
  units_count?: number;
  occupied_units_count?: number;
  vacant_units_count?: number;
};

function SummaryItem({
  icon,
  label,
  value,
  valueClassName = "text-white",
  iconWrapperClassName = "bg-white/5",
}: SummaryItemProps) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 text-center">
        <div className={`rounded-lg p-2 ${iconWrapperClassName}`}>{icon}</div>

        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            {label}
          </p>
          <p className={`text-base font-semibold leading-none ${valueClassName}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * BuildingCard
 *
 * Presentational card for a building record.
 *
 * Responsibilities:
 * - Show building identity and address
 * - Show a compact unit/occupancy summary
 * - Allow edit/delete actions
 * - Navigate to the building detail page
 */
export default function BuildingCard({
  building,
  onEdit,
  onDelete,
  disableDelete = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const summary = building as BuildingWithSummary;

  const unitsCount = summary.units_count ?? 0;
  const occupiedCount = summary.occupied_units_count ?? 0;
  const vacantCount =
    summary.vacant_units_count ?? Math.max(0, unitsCount - occupiedCount);

  const hasUnits = unitsCount > 0;

  const addressLine = [building.address_line1, building.address_line2]
    .filter(Boolean)
    .join(", ");

  const localityLine = [building.city, building.state, building.postal_code]
    .filter(Boolean)
    .join(", ");

  const handleViewUnits = useCallback(() => {
    navigate({
      pathname: `/dashboard/buildings/${building.id}`,
      search: location.search,
    });
  }, [building.id, location.search, navigate]);

  const handleEdit = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // # Step 1: Prevent parent click behavior.
      event.stopPropagation();
      onEdit?.(building);
    },
    [building, onEdit],
  );

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // # Step 1: Prevent parent click behavior.
      event.stopPropagation();

      // # Step 2: Respect disabled delete state.
      if (disableDelete) {
        return;
      }

      // # Step 3: Delegate delete action upward.
      onDelete?.(building);
    },
    [building, disableDelete, onDelete],
  );

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
              <Building2 className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="break-words text-xl font-semibold tracking-tight text-white">
                {building.name}
              </h3>

              <div className="mt-2.5 space-y-1.5">
                {addressLine ? (
                  <div className="flex items-start gap-2 text-sm text-neutral-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="break-words">{addressLine}</span>
                  </div>
                ) : null}

                {localityLine ? (
                  <p className="break-words pl-6 text-sm text-neutral-400">
                    {localityLine}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {(onEdit || onDelete) ? (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-neutral-800/80 transition hover:bg-white/10"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-neutral-800/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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

      <div className="mt-4">
        {hasUnits ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-white/[0.03]">
            <div className="grid grid-cols-3 divide-x divide-neutral-800/80">
              <SummaryItem
                icon={<DoorOpen className="h-4 w-4 text-neutral-300" />}
                label="Units"
                value={unitsCount}
                iconWrapperClassName="bg-white/5"
              />

              <SummaryItem
                icon={<Users className="h-4 w-4 text-emerald-300" />}
                label="Occupied"
                value={occupiedCount}
                valueClassName="text-emerald-300"
                iconWrapperClassName="bg-emerald-400/10"
              />

              <SummaryItem
                icon={<BedDouble className="h-4 w-4 text-rose-300" />}
                label="Vacant"
                value={vacantCount}
                valueClassName="text-rose-300"
                iconWrapperClassName="bg-rose-400/10"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800/80 bg-white/[0.03] px-4 py-3">
            <p className="text-sm font-medium text-neutral-200">
              No units added yet
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Add units to start tracking occupancy and lease activity.
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="border-t border-neutral-800/80 pt-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              Open this building to manage units, tenants, and lease activity.
            </p>

            <button
              type="button"
              onClick={handleViewUnits}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white/5 px-3.5 py-2 text-sm font-medium text-neutral-100 ring-1 ring-neutral-800/80 transition hover:bg-white/10 hover:text-white sm:self-auto"
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