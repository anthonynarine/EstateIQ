// ✅ New Code
import React from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
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

  // Step 3: Format nicely for display
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getActiveTenantSummary(unit: UnitCardUnit): ActiveTenantSummary | null {
  // Step 1: Prefer structured backend summary
  if (unit.active_tenant_summary?.id && unit.active_tenant_summary.full_name) {
    return unit.active_tenant_summary;
  }

  // Step 2: Fall back to legacy flat fields
  if (unit.active_tenant_id && unit.active_tenant_name) {
    return {
      id: unit.active_tenant_id,
      full_name: unit.active_tenant_name,
      email: unit.active_tenant_email ?? null,
      phone: unit.active_tenant_phone ?? null,
    };
  }

  // Step 3: No valid tenant summary
  return null;
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.035] px-3 py-1 text-[11px] font-medium text-neutral-200">
      {children}
    </span>
  );
}

function SummaryCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/[0.07] text-cyan-300/85 ring-1 ring-cyan-400/8">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            {label}
          </p>
          <p className="truncate text-[15px] font-medium leading-6 text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryFooter({
  tone = "neutral",
  description,
  ctaLabel,
  onClick,
}: {
  tone?: "neutral" | "occupied" | "warning";
  description: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  const toneClasses =
    tone === "occupied"
      ? "text-emerald-200/90"
      : tone === "warning"
        ? "text-amber-100/90"
        : "text-neutral-300";

  return (
    <div className="mt-auto border-t border-white/6 pt-4">
      <p className={`mb-3 text-sm leading-6 ${toneClasses}`}>{description}</p>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-base font-semibold text-white transition hover:bg-white/[0.08]"
      >
        <span>{ctaLabel}</span>
        <ChevronRight className="h-5 w-5" />
      </button>
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

  const tenantSummary = getActiveTenantSummary(unit);
  const hasTenantSummary = Boolean(isOccupied && tenantSummary);
  const hasOccupancyDataIssue = Boolean(
    isOccupied && !tenantSummary && unit.occupancy_has_data_issue
  );
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
    <article className="group flex h-full min-h-[500px] flex-col rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/12 hover:shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Home className="h-[18px] w-[18px] shrink-0 text-cyan-300/85" />
            <h3 className="truncate text-[1.85rem] font-semibold leading-none tracking-tight text-white sm:text-[1.95rem]">
              {unitLabel}
            </h3>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${
                isOccupied
                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                  : "bg-white/[0.04] text-neutral-200 ring-white/10"
              }`}
            >
              {isOccupied ? "Occupied" : "Vacant"}
            </span>

            {bedsText ? <MetaPill>{bedsText}</MetaPill> : null}
            {bathsText ? <MetaPill>{bathsText}</MetaPill> : null}
            {sqftText ? <MetaPill>{sqftText}</MetaPill> : null}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.025] text-neutral-400 transition hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
                title="Edit unit"
              >
                <Pencil className="h-4.5 w-4.5" />
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.025] text-neutral-400 transition hover:border-white/12 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                title={
                  !canDelete
                    ? "Cannot delete an occupied unit. End the active lease first."
                    : "Delete unit"
                }
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        {hasTenantSummary && tenantSummary ? (
          <>
            <div className="rounded-[24px] border border-emerald-400/8 bg-emerald-500/[0.035] p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-300 ring-1 ring-emerald-400/10">
                  <User2 className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Current tenant
                  </p>

                  {onOpenTenant ? (
                    <button
                      type="button"
                      onClick={handleOpenTenant}
                      className="block max-w-full truncate text-left text-[1.22rem] font-semibold leading-tight text-white transition hover:text-cyan-300"
                    >
                      {tenantSummary.full_name}
                    </button>
                  ) : (
                    <p className="truncate text-[1.22rem] font-semibold leading-tight text-white">
                      {tenantSummary.full_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {tenantSummary.email ? (
                  <SummaryCell
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={tenantSummary.email}
                  />
                ) : null}

                {tenantSummary.phone ? (
                  <SummaryCell
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={tenantSummary.phone}
                  />
                ) : null}

                <SummaryCell
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Lease end"
                  value={leaseEndText ?? "Active lease on file"}
                />
              </div>
            </div>

            <SummaryFooter
              tone="occupied"
              description="Review lease details, dates, and tenant assignment for this unit."
              ctaLabel="Manage lease"
              onClick={handleOpen}
            />
          </>
        ) : null}

        {hasOccupancyDataIssue ? (
          <>
            <div className="rounded-[24px] border border-amber-400/10 bg-amber-500/[0.035] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/[0.08] text-amber-300 ring-1 ring-amber-400/10">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Occupancy warning
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-100">
                    Active lease exists, but the primary tenant summary is missing.
                  </p>
                </div>
              </div>
            </div>

            <SummaryFooter
              tone="warning"
              description="Open the lease workspace to repair tenant assignment and occupancy consistency."
              ctaLabel="Manage lease"
              onClick={handleOpen}
            />
          </>
        ) : null}

        {!isOccupied && !hasOccupancyDataIssue ? (
          <>
            <div className="rounded-[24px] border border-white/6 bg-white/[0.02] p-4">
              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                Vacancy
              </p>
              <p className="mt-1 text-[1.12rem] font-semibold text-white">
                No active lease on file
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                This unit is ready for lease setup and tenant assignment.
              </p>
            </div>

            <SummaryFooter
              tone="neutral"
              description="Create a lease to assign a tenant and transition this unit to occupied."
              ctaLabel="Create or manage lease"
              onClick={handleOpen}
            />
          </>
        ) : null}
      </div>
    </article>
  );
}
