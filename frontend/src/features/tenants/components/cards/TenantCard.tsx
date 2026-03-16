// # Filename: src/features/tenants/components/cards/TenantCard.tsx
// ✅ New Code

import { useCallback, type MouseEvent, type ReactNode } from "react";
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

type TenantInfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
};

/**
 * formatDisplayDate
 *
 * Converts an ISO date string into a readable UI label.
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
 * Builds a clean residence label without duplicating building text.
 *
 * Args:
 *   tenant: Tenant directory record.
 *
 * Returns:
 *   A readable residence label for the UI.
 */
function getResidenceLabel(tenant: Tenant): string {
  // Step 1: Handle tenants without an active lease
  if (!tenant.active_lease) {
    return "Not currently assigned";
  }

  // Step 2: Normalize raw labels
  const buildingLabel = tenant.active_lease.building?.label?.trim() ?? "";
  const unitLabel = tenant.active_lease.unit?.label?.trim() ?? "";

  // Step 3: If the unit label already contains the building text, use only the unit label
  if (
    buildingLabel &&
    unitLabel &&
    unitLabel.toLowerCase().includes(buildingLabel.toLowerCase())
  ) {
    return unitLabel;
  }

  // Step 4: If both labels exist and add unique value, join them
  if (buildingLabel && unitLabel) {
    return `${buildingLabel} • ${unitLabel}`;
  }

  // Step 5: Fall back to whichever label exists
  if (unitLabel) {
    return unitLabel;
  }

  if (buildingLabel) {
    return buildingLabel;
  }

  // Step 6: Final fallback
  return "Active lease assigned";
}

/**
 * TenantInfoRow
 *
 * Reusable row for tenant operational context.
 *
 * Args:
 *   icon: Leading icon.
 *   label: Small uppercase row label.
 *   value: Main row value.
 *   valueClassName: Optional override for the value text.
 *
 * Returns:
 *   A structured info row.
 */
function TenantInfoRow({
  icon,
  label,
  value,
  valueClassName = "text-white",
}: TenantInfoRowProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/[0.05]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p
          className={`mt-1 break-words text-sm font-semibold leading-6 ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * TenantCard
 *
 * A text-forward operations card that emphasizes tenant identity,
 * residency context, and lease actionability without duplicating state.
 *
 * Args:
 *   tenant: Tenant record from the directory API.
 *   onEdit: Opens tenant edit flow.
 *   onCreateLease: Opens create lease flow.
 *   onOpenLease: Opens current lease flow.
 *
 * Returns:
 *   Tenant card component.
 */
export default function TenantCard({
  tenant,
  onEdit,
  onCreateLease,
  onOpenLease,
}: Props) {
  const hasActiveLease = Boolean(tenant.active_lease);

  const residenceLabel = getResidenceLabel(tenant);
  const leaseStartLabel = hasActiveLease
    ? formatDisplayDate(tenant.active_lease?.start_date)
    : "—";

  const handleEdit = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Step 1: Prevent parent click behavior
      event.stopPropagation();

      // Step 2: Open edit action
      onEdit();
    },
    [onEdit]
  );

  const handleOpenLease = useCallback(() => {
    // Step 1: Guard missing handler
    if (!onOpenLease) {
      return;
    }

    // Step 2: Launch lease action
    onOpenLease();
  }, [onOpenLease]);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-400/20 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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
                  <span className="break-all">
                    {tenant.email || "Email not provided"}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-neutral-300">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <span>{tenant.phone || "Phone not provided"}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
              title="Manage tenant"
              aria-label={`Edit ${tenant.full_name}`}
            >
              <Pencil className="h-4 w-4 text-neutral-200" />
            </button>
          </div>

          {/* Step 2: Operational context */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
            <TenantInfoRow
              icon={<Home className="h-4 w-4 text-neutral-300" />}
              label="Residence"
              value={residenceLabel}
              valueClassName={hasActiveLease ? "text-white" : "text-neutral-100"}
            />

            <div className="h-px bg-white/[0.04]" />

            <TenantInfoRow
              icon={<CalendarDays className="h-4 w-4 text-neutral-300" />}
              label="Lease start"
              value={leaseStartLabel}
              valueClassName={hasActiveLease ? "text-white" : "text-neutral-400"}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Footer */}
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
                onClick={handleOpenLease}
                disabled={!onOpenLease}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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