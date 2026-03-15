// # Filename: src/features/tenants/components/cards/TenantCard.tsx
// ✅ New Code

import { useCallback } from "react";
import {
  Pencil,
  PlusCircle,
  FileText,
  Users,
  Mail,
  Phone,
  Home,
  CalendarDays,
} from "lucide-react";

import type { Tenant } from "../../api/types";
import TenantStatusBadge from "../shared/TenantStatusBadge";

type Props = {
  tenant: Tenant;
  onEdit: () => void;
  onCreateLease: () => void;
  onOpenLease?: () => void;
};

/**
 * formatDisplayDate
 *
 * Converts an ISO date string into a compact human-friendly label.
 *
 * Args:
 *   value: Raw API date string.
 *
 * Returns:
 *   A formatted date string or a fallback dash.
 */
function formatDisplayDate(value?: string | null): string {
  // Step 1: Guard empty values
  if (!value) {
    return "—";
  }

  // Step 2: Parse the date safely
  const parsedDate = new Date(value);

  // Step 3: Fallback if parsing fails
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // Step 4: Return a concise formatted date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * getResidenceLabel
 *
 * Builds the current residence label from active lease data.
 *
 * Args:
 *   tenant: Tenant directory record.
 *
 * Returns:
 *   A readable residence label for the UI.
 */
function getResidenceLabel(tenant: Tenant): string {
  // Step 1: Handle inactive tenants
  if (!tenant.active_lease) {
    return "Not currently assigned";
  }

  // Step 2: Build a stable label from building + unit
  const parts = [
    tenant.active_lease.building?.label,
    tenant.active_lease.unit?.label,
  ].filter(Boolean);

  // Step 3: Join when possible
  if (parts.length > 0) {
    return parts.join(" • ");
  }

  // Step 4: Fallback
  return "Active lease assigned";
}

/**
 * TenantCard
 *
 * Tenant directory card aligned with the app's premium card language, but
 * tuned for text-heavy tenant content instead of numeric building stats.
 */
export default function TenantCard({
  tenant,
  onEdit,
  onCreateLease,
  onOpenLease,
}: Props) {
  const hasActiveLease = Boolean(tenant.active_lease);

  const handleEdit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onEdit();
    },
    [onEdit]
  );

  const residenceLabel = getResidenceLabel(tenant);
  const leaseStatusLabel = hasActiveLease ? "Current lease" : "No current lease";
  const leaseStartLabel = hasActiveLease
    ? formatDisplayDate(tenant.active_lease?.start_date)
    : "—";

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Step 1: Header */}
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
              <Users className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold tracking-tight text-white">
                  {tenant.full_name}
                </h3>

                <TenantStatusBadge status={tenant.occupancy_status} />
              </div>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-start gap-2 text-sm text-neutral-300">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <span className="truncate">
                    {tenant.email || "Email not provided"}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-neutral-300">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <span className="truncate">
                    {tenant.phone || "Phone not provided"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Tenant-specific info panel */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="grid gap-0 sm:grid-cols-[1.6fr_1fr]">
              {/* Step 2A: Residence gets the most space */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white/5 p-2">
                    <Home className="h-4 w-4 text-neutral-300" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Residence
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold leading-5 text-white">
                      {residenceLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2B: Lease status stays compact */}
              <div className="border-t border-white/8 px-4 py-3 sm:border-l sm:border-t-0">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2 ${
                      hasActiveLease ? "bg-emerald-400/10" : "bg-rose-400/10"
                    }`}
                  >
                    <FileText
                      className={`h-4 w-4 ${
                        hasActiveLease ? "text-emerald-300" : "text-rose-300"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Lease status
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        hasActiveLease ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {leaseStatusLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2C: Second row for date only */}
            <div className="border-t border-white/8 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/5 p-2">
                  <CalendarDays className="h-4 w-4 text-neutral-300" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    Lease start
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {leaseStartLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Compact edit action */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
            title="Manage tenant"
            aria-label={`Edit ${tenant.full_name}`}
          >
            <Pencil className="h-4 w-4 text-neutral-200" />
          </button>
        </div>
      </div>

      {/* Step 4: Footer action strip */}
      <div className="mt-auto pt-5">
        <div className="border-t border-white/10 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              {hasActiveLease
                ? "Open this lease to review occupancy and billing activity."
                : "This tenant is ready to be assigned to a new lease."}
            </p>

            {hasActiveLease ? (
              <button
                type="button"
                onClick={onOpenLease}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
              >
                Open lease
                <FileText className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateLease}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500/10 px-3.5 py-2.5 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/15"
              >
                Create lease
                <PlusCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}