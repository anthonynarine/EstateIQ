// # Filename: src/features/billing/components/LeaseLedgerHeader.tsx
// ✅ New Code

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  RefreshCw,
  ReceiptText,
} from "lucide-react";

import type {
  BillingEntitySummary,
  LeaseLedgerContext,
  MoneyValue,
} from "../api/billingTypes";

/**
 * LeaseLedgerHeaderProps
 *
 * Presentational contract for the lease billing workspace header.
 *
 * This component stays UI-only.
 * It does not fetch data, navigate directly, or mutate billing records.
 * The page layer owns orchestration and passes in prepared context/actions.
 */
export interface LeaseLedgerHeaderProps {
  lease?: LeaseLedgerContext;
  leaseId?: string | number;
  isLoading?: boolean;
  isRefreshing?: boolean;
  breadcrumbText?: string | null;
  backToUnitDisabled?: boolean;
  onBackToUnit?: () => void;
  onRecordPayment?: () => void;
}

/**
 * formatCurrencyValue
 *
 * Formats a money-like value into a USD currency string.
 *
 * @param value Monetary value from the billing read model.
 * @returns A formatted currency string or fallback placeholder.
 */
function formatCurrencyValue(value?: MoneyValue): string {
  // Step 1: Guard empty values
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  // Step 2: Parse the numeric value
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "—";
  }

  // Step 3: Return display-safe currency text
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

/**
 * formatDueDayLabel
 *
 * Converts a numeric due day into a readable label.
 *
 * @param dueDay Lease due day from the backend.
 * @returns Human-friendly due day text.
 */
function formatDueDayLabel(dueDay?: number | null): string {
  // Step 1: Guard missing values
  if (!dueDay) {
    return "—";
  }

  // Step 2: Return label
  return `Day ${dueDay}`;
}

/**
 * buildTenantDisplayText
 *
 * Produces the most useful tenant display label from the lease context.
 *
 * @param lease Lease ledger context payload.
 * @returns Tenant display text.
 */
function buildTenantDisplayText(lease?: LeaseLedgerContext): string {
  // Step 1: Prefer explicit tenant display text
  if (lease?.tenant_display?.trim()) {
    return lease.tenant_display;
  }

  // Step 2: Fallback to joined tenant names
  if (lease?.tenant_names?.length) {
    return lease.tenant_names.join(", ");
  }

  // Step 3: Final fallback
  return "Tenant pending";
}

/**
 * buildBuildingDisplay
 *
 * Resolves the building label from the ledger context.
 *
 * @param building Building summary.
 * @returns Display-safe building label.
 */
function buildBuildingDisplay(
  building?: BillingEntitySummary | null,
): string {
  return building?.label?.trim() || "Building pending";
}

/**
 * buildUnitDisplay
 *
 * Resolves the unit label from the ledger context.
 *
 * @param unit Unit summary.
 * @returns Display-safe unit label.
 */
function buildUnitDisplay(unit?: BillingEntitySummary | null): string {
  return unit?.label?.trim() || "Unit pending";
}

/**
 * buildLeaseIdDisplay
 *
 * Resolves the best lease id to display.
 *
 * @param lease Lease context payload.
 * @param leaseId Route-level lease id fallback.
 * @returns A lease id string or fallback placeholder.
 */
function buildLeaseIdDisplay(
  lease?: LeaseLedgerContext,
  leaseId?: string | number,
): string {
  // Step 1: Prefer backend lease id
  const contextLeaseId = lease?.lease_id;

  if (contextLeaseId !== null && contextLeaseId !== undefined) {
    return String(contextLeaseId);
  }

  // Step 2: Fallback to route param
  if (leaseId !== null && leaseId !== undefined) {
    return String(leaseId);
  }

  // Step 3: Final fallback
  return "—";
}

/**
 * buildStatusLabel
 *
 * Produces a readable lease status label.
 *
 * @param status Raw backend lease status.
 * @returns Display-safe status label.
 */
function buildStatusLabel(status?: string): string {
  // Step 1: Guard empty values
  const trimmedStatus = status?.trim();

  if (!trimmedStatus) {
    return "Unknown";
  }

  // Step 2: Convert machine text to title text
  return trimmedStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * getStatusPillClasses
 *
 * Maps lease status to the shared app pill tone.
 *
 * @param status Raw lease status.
 * @returns Tailwind class string for the status pill.
 */
function getStatusPillClasses(status?: string): string {
  // Step 1: Normalize status
  const normalizedStatus = status?.trim().toLowerCase();

  // Step 2: Return app-consistent pill styling
  switch (normalizedStatus) {
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "draft":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "ended":
    case "expired":
    case "terminated":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/[0.03] text-neutral-300";
  }
}

/**
 * buildWorkspaceSubtitle
 *
 * Provides a stable, user-facing explanation of the page purpose.
 *
 * @param isLoading Whether the lease context is still loading.
 * @returns Subtitle text for the workspace header.
 */
function buildWorkspaceSubtitle(isLoading: boolean): string {
  if (isLoading) {
    return "Loading lease billing context…";
  }

  return "Review charges, payments, and allocations for this lease, then record the next billing event.";
}

/**
 * LeaseLedgerHeader
 *
 * Premium workspace header for the lease billing page.
 *
 * Layout goals:
 * - match the EstateIQ lease workspace shell
 * - keep navigation contextual
 * - make the billing purpose obvious
 * - present actions intentionally, not as detached controls
 *
 * @param props Header display props.
 * @returns Lease billing workspace header.
 */
export default function LeaseLedgerHeader({
  lease,
  leaseId,
  isLoading = false,
  isRefreshing = false,
  breadcrumbText = null,
  backToUnitDisabled = false,
  onBackToUnit,
  onRecordPayment,
}: LeaseLedgerHeaderProps) {
  const tenantDisplay = buildTenantDisplayText(lease);
  const buildingDisplay = buildBuildingDisplay(lease?.building);
  const unitDisplay = buildUnitDisplay(lease?.unit);
  const leaseIdDisplay = buildLeaseIdDisplay(lease, leaseId);
  const statusLabel = buildStatusLabel(lease?.lease_status);
  const statusPillClasses = getStatusPillClasses(lease?.lease_status);
  const rentAmountLabel = formatCurrencyValue(lease?.rent_amount);
  const dueDayLabel = formatDueDayLabel(lease?.due_day);
  const subtitle = buildWorkspaceSubtitle(isLoading);

  return (
    <section
      className="
        overflow-hidden rounded-3xl border border-white/10
        bg-gradient-to-b from-neutral-900/90 to-neutral-950/90
        shadow-[0_0_0_1px_rgba(255,255,255,0.02)]
      "
    >
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center">
              {onBackToUnit ? (
                <button
                  type="button"
                  onClick={onBackToUnit}
                  disabled={backToUnitDisabled}
                  className="
                    inline-flex items-center gap-2 rounded-xl
                    border border-white/10 bg-white/[0.03]
                    px-3 py-2 text-sm font-medium text-neutral-200
                    transition hover:bg-white/[0.06] hover:text-white
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Unit
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClasses}`}
                title="Lease status"
              >
                {statusLabel}
              </span>

              <span
                className="
                  inline-flex items-center rounded-full border
                  border-white/10 bg-white/[0.03]
                  px-3 py-1 text-xs font-medium text-neutral-300
                "
                title="Lease identifier"
              >
                Lease #{leaseIdDisplay}
              </span>

              <span
                className="
                  inline-flex items-center rounded-full border
                  border-white/10 bg-white/[0.03]
                  px-3 py-1 text-xs text-neutral-400
                "
                title="Billing workspace"
              >
                Lease billing
              </span>

              {isRefreshing ? (
                <span
                  className="
                    inline-flex items-center gap-2 rounded-full border
                    border-white/10 bg-white/[0.03]
                    px-3 py-1 text-xs text-neutral-400
                  "
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Refreshing…
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div
                className="
                  inline-flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-2xl border border-cyan-400/20 bg-cyan-500/10
                  text-cyan-200 sm:h-12 sm:w-12
                "
              >
                <ReceiptText className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-2">
                {breadcrumbText ? (
                  <p className="truncate text-sm font-medium tracking-wide text-neutral-400">
                    {breadcrumbText}
                  </p>
                ) : null}

                <div className="flex min-w-0 items-center gap-2">
                  <Home className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <p className="truncate text-sm font-medium tracking-wide text-neutral-400">
                    {buildingDisplay}
                  </p>
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem] lg:text-[2.2rem]">
                  Lease ledger
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-neutral-300">
                  {subtitle}
                </p>

                <p className="text-base font-semibold text-white">
                  {tenantDisplay}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[220px]">
              {onRecordPayment ? (
                <button
                  type="button"
                  onClick={onRecordPayment}
                  className="
                    inline-flex items-center justify-center gap-2 rounded-xl
                    bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-100
                    ring-1 ring-white/10 transition
                    hover:bg-white/8 hover:text-white
                  "
                >
                  <CreditCard className="h-4 w-4" />
                  Record payment
                </button>
              ) : null}

              <div
                className="
                  rounded-2xl border border-white/10 bg-white/[0.03]
                  px-4 py-3 text-sm text-neutral-300
                "
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  Workspace
                </p>
                <p className="mt-2 leading-6">
                  This is the billing workspace for one lease. Unit history can
                  link here later, but it should not replace this ledger as the
                  operational write surface.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
              className="
                rounded-2xl border border-white/10 bg-white/[0.03]
                px-4 py-3
              "
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                Rent amount
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {rentAmountLabel}
              </p>
            </div>

            <div
              className="
                rounded-2xl border border-white/10 bg-white/[0.03]
                px-4 py-3
              "
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500" />
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                  Due day
                </p>
              </div>
              <p className="mt-2 text-lg font-semibold text-white">
                {dueDayLabel}
              </p>
            </div>

            <div
              className="
                rounded-2xl border border-white/10 bg-white/[0.03]
                px-4 py-3
              "
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-neutral-500" />
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                  Building
                </p>
              </div>
              <p className="mt-2 truncate text-lg font-semibold text-white">
                {buildingDisplay}
              </p>
            </div>

            <div
              className="
                rounded-2xl border border-white/10 bg-white/[0.03]
                px-4 py-3
              "
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                Unit
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-white">
                {unitDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}