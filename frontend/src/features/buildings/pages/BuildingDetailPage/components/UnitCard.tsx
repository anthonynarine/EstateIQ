// # Filename: src/features/buildings/pages/BuildingDetailPage/components/UnitCard.tsx


import React from "react";
import { Pencil, Trash2 } from "lucide-react";

type UnitCardUnit = {
  id: number;
  label: string | null;
  bedrooms: number | string | null;
  bathrooms: number | string | null;
  sqft: number | string | null;
};

type Props = {
  unit: UnitCardUnit;
  isOccupied: boolean;

  // ❌ Removed: leasesLoading (we never show "Checking...")
  onOpen: (unit: UnitCardUnit) => void;

  onEdit?: (unit: UnitCardUnit) => void;
  onDelete?: (unit: UnitCardUnit) => void;
  disableDeleteWhenOccupied?: boolean;
};

/**
 * formatDecimalLikeUser
 *
 * Formats values like:
 * - "2.00" -> "2"
 * - "2.50" -> "2.5"
 * - 2 -> "2"
 * - 2.5 -> "2.5"
 */
function formatDecimalLikeUser(value: number | string): string {
  // Step 1: Normalize to number when possible
  const n = typeof value === "string" ? Number(value) : value;

  // Step 2: If parsing fails, fall back to raw
  if (!Number.isFinite(n)) return String(value);

  // Step 3: Stringify + trim trailing zeros defensively
  const s = String(n);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * UnitCard
 *
 * Presentational unit card.
 *
 * Key UX choice:
 * - We DO NOT show "Checking..." state.
 * - We always render either Occupied or Vacant based on `isOccupied`.
 *
 * This keeps the UI deterministic and avoids “loading-pill” fatigue.
 */
export default function UnitCard({
  unit,
  isOccupied,
  onOpen,
  onEdit,
  onDelete,
  disableDeleteWhenOccupied = true,
}: Props) {
  // Step 1: Display helpers
  const unitLabel = unit.label?.trim() ? unit.label.trim() : `#${unit.id}`;

  const bedsText =
    unit.bedrooms === null ? null : `${formatDecimalLikeUser(unit.bedrooms)} bd`;

  const bathsText =
    unit.bathrooms === null
      ? null
      : `${formatDecimalLikeUser(unit.bathrooms)} ba`;

  const sqftText =
    unit.sqft === null ? null : `${formatDecimalLikeUser(unit.sqft)} sqft`;

  const canDelete = !(disableDeleteWhenOccupied && isOccupied);

  // Step 2: Handlers
  const handleOpen = () => onOpen(unit);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(unit);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;
    onDelete?.(unit);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-white">{unitLabel}</div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isOccupied
                  ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
                  : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
              }`}
            >
              {isOccupied ? "Occupied" : "Vacant"}
            </span>

            {bedsText ? (
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
                {bedsText}
              </span>
            ) : null}

            {bathsText ? (
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
                {bathsText}
              </span>
            ) : null}

            {sqftText ? (
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
                {sqftText}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="text-sm text-neutral-200 hover:text-white"
          >
            Manage leases →
          </button>
        </div>

        {onEdit || onDelete ? (
          <div className="flex items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                title="Edit unit"
              >
                <Pencil className="h-4 w-4 text-neutral-200" />
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                ].join(" ")}
                title={
                  !canDelete
                    ? "Cannot delete an occupied unit. End the active lease first."
                    : "Delete unit"
                }
              >
                <Trash2 className="h-4 w-4 text-neutral-200" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}