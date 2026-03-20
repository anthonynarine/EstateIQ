// # Filename: src/features/units/components/cards/UnitCard.tsx
// ✅ New Code

import React, { useCallback } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User2,
} from "lucide-react";

type ActiveTenantSummary = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type UnitCardUnit = {
  id: number;
  label: string | null;
  bedrooms: number | string | null;
  bathrooms: number | string | null;
  sqft: number | string | null;
  active_lease_end_date?: string | null;
  active_tenant_id?: number | null;
  active_tenant_name?: string | null;
  active_tenant_email?: string | null;
  active_tenant_phone?: string | null;
  active_tenant_summary?: ActiveTenantSummary | null;
  occupancy_has_data_issue?: boolean;
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

/**
 * formatDecimalLikeUser
 *
 * Formats a numeric value without unnecessary trailing zeroes.
 *
 * Args:
 *   value: Numeric or numeric-like value from the API.
 *
 * Returns:
 *   A compact UI-friendly string.
 */
function formatDecimalLikeUser(value: number | string): string {
  // Step 1: Normalize to number when possible
  const normalized = typeof value === "string" ? Number(value) : value;

  // Step 2: Fall back when conversion is not safe
  if (!Number.isFinite(normalized)) {
    return String(value);
  }

  // Step 3: Trim trailing decimal zeroes
  const serialized = String(normalized);
  return serialized.includes(".")
    ? serialized.replace(/0+$/, "").replace(/\.$/, "")
    : serialized;
}

/**
 * formatLeaseEndDate
 *
 * Converts an ISO date string into a concise display label.
 *
 * Args:
 *   value: Raw lease end date.
 *
 * Returns:
 *   A formatted label or null.
 */
function formatLeaseEndDate(value?: string | null): string | null {
  // Step 1: Guard empty input
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  // Step 2: Guard invalid date parsing
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // Step 3: Return a human-readable date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * getActiveTenantSummary
 *
 * Normalizes current tenant data from either the structured summary or
 * the legacy flat fields.
 *
 * Args:
 *   unit: Unit record.
 *
 * Returns:
 *   Tenant summary or null.
 */
function getActiveTenantSummary(unit: UnitCardUnit): ActiveTenantSummary | null {
  // Step 1: Prefer the structured API summary
  if (unit.active_tenant_summary?.id && unit.active_tenant_summary.full_name) {
    return unit.active_tenant_summary;
  }

  // Step 2: Fall back to legacy fields
  if (unit.active_tenant_id && unit.active_tenant_name) {
    return {
      id: unit.active_tenant_id,
      full_name: unit.active_tenant_name,
      email: unit.active_tenant_email ?? null,
      phone: unit.active_tenant_phone ?? null,
    };
  }

  // Step 3: No usable tenant context
  return null;
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-neutral-200">
      {children}
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/[0.05]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-6 text-white">
          {value}
        </p>
      </div>
    </div>
  );
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
  // Step 1: Derive display labels
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

  const tenantSummary = getActiveTenantSummary(unit);
  const hasTenantSummary = Boolean(isOccupied && tenantSummary);
  const hasOccupancyDataIssue = Boolean(
    isOccupied && !tenantSummary && unit.occupancy_has_data_issue
  );
  const hasContactDetails = Boolean(
    tenantSummary?.email || tenantSummary?.phone || leaseEndText
  );
  const canDelete = !(disableDeleteWhenOccupied && isOccupied);

  // Step 2: Memoize UI actions
  const handleOpen = useCallback(() => {
    onOpen(unit);
  }, [onOpen, unit]);

  const handleEdit = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Step 1: Prevent accidental parent click behavior
      event.stopPropagation();

      // Step 2: Delegate edit action upward
      onEdit?.(unit);
    },
    [onEdit, unit]
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Step 1: Prevent accidental parent click behavior
      event.stopPropagation();

      // Step 2: Guard prohibited delete state
      if (!canDelete) {
        return;
      }

      // Step 3: Delegate delete action upward
      onDelete?.(unit);
    },
    [canDelete, onDelete, unit]
  );

  const handleOpenTenant = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Step 1: Prevent nested click bubbling
      event.stopPropagation();

      // Step 2: Open tenant context when available
      onOpenTenant?.();
    },
    [onOpenTenant]
  );

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Step 3: Header */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
                <Home className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-semibold tracking-tight text-white">
                    {unitLabel}
                  </h3>

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                      isOccupied
                        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                        : "bg-white/[0.04] text-neutral-200 ring-white/10"
                    }`}
                  >
                    {isOccupied ? "Occupied" : "Vacant"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {bedsText ? <MetaPill>{bedsText}</MetaPill> : null}
                  {bathsText ? <MetaPill>{bathsText}</MetaPill> : null}
                  {sqftText ? <MetaPill>{sqftText}</MetaPill> : null}
                </div>
              </div>
            </div>

            {/* Step 4: Primary body content */}
            {hasTenantSummary && tenantSummary ? (
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="rounded-xl bg-emerald-400/10 p-2 ring-1 ring-emerald-400/15">
                    <User2 className="h-4 w-4 text-emerald-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Current tenant
                    </p>

                    {onOpenTenant ? (
                      <button
                        type="button"
                        onClick={handleOpenTenant}
                        className="mt-1 block max-w-full truncate text-left text-sm font-semibold text-white transition hover:text-cyan-300"
                      >
                        {tenantSummary.full_name}
                      </button>
                    ) : (
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {tenantSummary.full_name}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-neutral-400">
                      Lease end: {leaseEndText ?? "Active lease on file"}
                    </p>
                  </div>
                </div>

                {hasContactDetails ? (
                  <details className="group/details border-t border-white/[0.05]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-neutral-300 marker:hidden transition hover:bg-white/[0.02] hover:text-white">
                      <span>Tenant details</span>
                      <ChevronDown className="h-4 w-4 transition group-open/details:rotate-180" />
                    </summary>

                    <div className="border-t border-white/[0.05] bg-white/[0.015]">
                      {tenantSummary.email ? (
                        <>
                          <DetailRow
                            icon={<Mail className="h-4 w-4 text-neutral-300" />}
                            label="Email"
                            value={tenantSummary.email}
                          />
                          <div className="h-px bg-white/[0.04]" />
                        </>
                      ) : null}

                      {tenantSummary.phone ? (
                        <>
                          <DetailRow
                            icon={<Phone className="h-4 w-4 text-neutral-300" />}
                            label="Phone"
                            value={tenantSummary.phone}
                          />
                          <div className="h-px bg-white/[0.04]" />
                        </>
                      ) : null}

                      <DetailRow
                        icon={<CalendarDays className="h-4 w-4 text-neutral-300" />}
                        label="Lease end"
                        value={leaseEndText ?? "Active lease on file"}
                      />
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}

            {hasOccupancyDataIssue ? (
              <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.035] px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/[0.08] p-2 ring-1 ring-amber-400/10">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Occupancy warning
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-100">
                      Active lease exists, but the tenant summary is missing.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {!isOccupied && !hasOccupancyDataIssue ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium text-neutral-200">
                  No active lease on file
                </p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  This unit is ready for lease setup and tenant assignment.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {(onEdit || onDelete) ? (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Step 5: Footer */}
      <div className="mt-auto pt-5">
        <div className="border-t border-white/10 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              {hasTenantSummary
                ? "Open this unit to manage the active lease and related tenant details."
                : hasOccupancyDataIssue
                  ? "Open this unit to repair occupancy consistency and verify tenant linkage."
                  : "Open this unit to create a lease and transition it to occupied."}
            </p>

            <button
              type="button"
              onClick={handleOpen}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1 transition ${
                hasTenantSummary || hasOccupancyDataIssue
                  ? "bg-white/5 text-neutral-100 ring-white/10 hover:bg-white/10 hover:text-white"
                  : "bg-cyan-500/10 text-cyan-200 ring-cyan-400/20 hover:bg-cyan-500/15"
              }`}
            >
              {hasTenantSummary || hasOccupancyDataIssue
                ? "Manage lease"
                : "Create lease"}
              <FileText className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
