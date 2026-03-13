// # Filename: src/features/buildings/pages/BuildingDetailPage/components/UnitCard.tsx

import React from "react";
import {
  ChevronRight,
  Pencil,
  Trash2,
  User2,
  CalendarDays,
  Home,
} from "lucide-react";

type UnitCardUnit = {
  id: number;
  label: string | null;
  bedrooms: number | string | null;
  bathrooms: number | string | null;
  sqft: number | string | null;
  active_lease_end_date?: string | null;
  active_tenant_id?: number | null;
  active_tenant_name?: string | null;
};

type Props = {
  unit: UnitCardUnit;
  isOccupied: boolean;
  onOpen: (unit: UnitCardUnit) => void;
  onOpenTenant?: () => void;
  onEdit?: (unit: UnitCardUnit) => void;
  onDelete?: (unit: UnitCardUnit) => void;
  disableDeleteWhenOccupied?: boolean;
};

function formatDecimalLikeUser(value: number | string): string {
  // Step 1: Normalize to number when possible
  const n = typeof value === "string" ? Number(value) : value;

  // Step 2: Guard invalid numeric conversion
  if (!Number.isFinite(n)) {
    return String(value);
  }

  // Step 3: Trim trailing zeroes
  const s = String(n);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

function formatLeaseEndDate(value?: string | null): string | null {
  // Step 1: Guard empty input
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  // Step 2: Guard invalid date
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  // Step 3: Format nicely for landlords
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default function UnitCard({
  unit,
  isOccupied,
  onOpen,
  onOpenTenant,
  onEdit,
  onDelete,
  disableDeleteWhenOccupied = true,
}: Props) {
  // Step 1: Derived display values
  const unitLabel = unit.label?.trim() ? unit.label.trim() : `#${unit.id}`;
  const leaseEndText = formatLeaseEndDate(unit.active_lease_end_date);

  const bedsText =
    unit.bedrooms === null ? null : `${formatDecimalLikeUser(unit.bedrooms)} bd`;

  const bathsText =
    unit.bathrooms === null
      ? null
      : `${formatDecimalLikeUser(unit.bathrooms)} ba`;

  const sqftText =
    unit.sqft === null ? null : `${formatDecimalLikeUser(unit.sqft)} sqft`;

  const hasTenantSummary = Boolean(isOccupied && unit.active_tenant_name);
  const canDelete = !(disableDeleteWhenOccupied && isOccupied);

  // Step 2: Event handlers
  const handleOpen = () => onOpen(unit);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(unit);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) {
      return;
    }
    onDelete?.(unit);
  };

  const handleOpenTenant = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenTenant?.();
  };

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 shrink-0 text-cyan-300/80" />
                <h3 className="truncate text-lg font-semibold tracking-tight text-white">
                  {unitLabel}
                </h3>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    isOccupied
                      ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/25"
                      : "bg-zinc-500/12 text-zinc-300 ring-1 ring-zinc-400/20"
                  }`}
                >
                  {isOccupied ? "Occupied" : "Vacant"}
                </span>

                {bedsText ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-white/10">
                    {bedsText}
                  </span>
                ) : null}

                {bathsText ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-white/10">
                    {bathsText}
                  </span>
                ) : null}

                {sqftText ? (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-white/10">
                    {sqftText}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {hasTenantSummary ? (
            <div className="overflow-hidden rounded-2xl border border-emerald-400/12 bg-emerald-500/[0.045]">
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-emerald-400/10 p-2">
                    <User2 className="h-4 w-4 text-emerald-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Active tenant
                    </p>

                    {onOpenTenant ? (
                      <button
                        type="button"
                        onClick={handleOpenTenant}
                        className="truncate text-left text-sm font-semibold text-white transition hover:text-cyan-300"
                      >
                        {unit.active_tenant_name}
                      </button>
                    ) : (
                      <p className="truncate text-sm font-semibold text-white">
                        {unit.active_tenant_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-white/8" />

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-cyan-400/10 p-2">
                    <CalendarDays className="h-4 w-4 text-cyan-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Lease
                    </p>
                    <p className="truncate text-sm text-neutral-200">
                      {leaseEndText ? `Ends ${leaseEndText}` : "Active lease on file"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleOpen}
              className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-neutral-200 ring-1 ring-white/10 transition hover:bg-white/8 hover:text-white"
            >
              <span>{isOccupied ? "Manage leases" : "Create or manage lease"}</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            {hasTenantSummary && onOpenTenant ? (
              <button
                type="button"
                onClick={handleOpenTenant}
                className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
              >
                <span>View tenant</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {onEdit || onDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
    </article>
  );
}