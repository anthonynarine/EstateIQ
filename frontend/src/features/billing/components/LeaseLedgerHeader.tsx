// # Filename: src/features/billing/components/LeaseLedgerHeader.tsx


import type {
  BillingEntitySummary,
  LeaseLedgerContext,
  MoneyValue,
} from "../api/billingTypes";

/**
 * LeaseLedgerHeaderProps
 *
 * Public props contract for the lease ledger header component.
 */
export interface LeaseLedgerHeaderProps {
  lease?: LeaseLedgerContext;
  leaseId?: string | number;
  isLoading?: boolean;
}

/**
 * formatCurrencyValue
 *
 * Formats a money-like value into a USD currency string for display.
 *
 * Why this helper exists:
 * Billing API responses may return decimal values as strings. This component
 * should display them consistently without pushing formatting logic back into
 * the page layer.
 *
 * @param value - Monetary value from the billing read model.
 * @returns A formatted currency string or a fallback placeholder.
 */
function formatCurrencyValue(value?: MoneyValue): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "—";
  }

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
 * @param dueDay - Lease due day from the backend.
 * @returns A human-readable due day label.
 */
function formatDueDayLabel(dueDay?: number | null): string {
  if (!dueDay) {
    return "—";
  }

  return `Day ${dueDay}`;
}

/**
 * buildTenantDisplayText
 *
 * Produces the most useful tenant display text from the lease context.
 *
 * Priority:
 * 1. explicit tenant_display
 * 2. tenant_names joined together
 * 3. fallback placeholder
 *
 * @param lease - Lease ledger context payload.
 * @returns A readable tenant label.
 */
function buildTenantDisplayText(lease?: LeaseLedgerContext): string {
  if (lease?.tenant_display?.trim()) {
    return lease.tenant_display;
  }

  if (lease?.tenant_names?.length) {
    return lease.tenant_names.join(", ");
  }

  return "Tenant pending";
}

/**
 * buildLocationText
 *
 * Combines building and unit information into a single readable location line.
 *
 * @param building - Building display summary from the ledger context.
 * @param unit - Unit display summary from the ledger context.
 * @returns A location label suitable for the page header.
 */
function buildLocationText(
  building?: BillingEntitySummary | null,
  unit?: BillingEntitySummary | null,
): string {
  const buildingLabel = building?.label?.trim();
  const unitLabel = unit?.label?.trim();

  if (buildingLabel && unitLabel) {
    return `${buildingLabel} • ${unitLabel}`;
  }

  if (buildingLabel) {
    return buildingLabel;
  }

  if (unitLabel) {
    return unitLabel;
  }

  return "Property context pending";
}

/**
 * buildLeaseIdDisplay
 *
 * Resolves the most useful lease id value for display.
 *
 * @param lease - Lease ledger context payload.
 * @param leaseId - Optional lease id fallback from the route layer.
 * @returns A lease id string or fallback placeholder.
 */
function buildLeaseIdDisplay(
  lease?: LeaseLedgerContext,
  leaseId?: string | number,
): string {
  const contextLeaseId = lease?.lease_id;

  if (contextLeaseId !== null && contextLeaseId !== undefined) {
    return String(contextLeaseId);
  }

  if (leaseId !== null && leaseId !== undefined) {
    return String(leaseId);
  }

  return "—";
}

/**
 * buildStatusLabel
 *
 * Produces a readable lease status label from the backend payload.
 *
 * @param status - Raw lease status string from the ledger context.
 * @returns A display-safe status label.
 */
function buildStatusLabel(status?: string): string {
  const trimmedStatus = status?.trim();

  if (!trimmedStatus) {
    return "Unknown";
  }

  return trimmedStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * LeaseLedgerHeader
 *
 * Presentational header component for the lease ledger page.
 *
 * Responsibilities:
 * - display lease identity and context
 * - show tenant, property, rent, and due-day information
 * - provide stable visual output when data is still loading or incomplete
 *
 * Important architectural boundary:
 * This component is read-only. It does not fetch data, mutate billing records,
 * or compute ledger balances. It only presents lease context already prepared
 * by the page/query layer.
 *
 * @param props - Header display props.
 * @returns A styled lease ledger header.
 */
export default function LeaseLedgerHeader({
  lease,
  leaseId,
  isLoading = false,
}: LeaseLedgerHeaderProps) {
  const tenantDisplay = buildTenantDisplayText(lease);
  const locationDisplay = buildLocationText(lease?.building, lease?.unit);
  const leaseIdDisplay = buildLeaseIdDisplay(lease, leaseId);
  const statusLabel = buildStatusLabel(lease?.lease_status);
  const rentAmountLabel = formatCurrencyValue(lease?.rent_amount);
  const dueDayLabel = formatDueDayLabel(lease?.due_day);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
            Billing
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Lease ledger
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {isLoading
              ? "Loading lease context..."
              : "The lease ledger is the billing source of truth for charges, payments, allocations, and balance visibility."}
          </p>

          <div className="mt-5 space-y-2">
            <p className="text-lg font-medium text-slate-100">
              {tenantDisplay}
            </p>

            <p className="text-sm text-slate-400">{locationDisplay}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">
            {statusLabel}
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
            Lease #{leaseIdDisplay}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Rent Amount
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {rentAmountLabel}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Due Day
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {dueDayLabel}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Building
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {lease?.building?.label ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Unit
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {lease?.unit?.label ?? "—"}
          </p>
        </div>
      </div>
    </section>
  );
}