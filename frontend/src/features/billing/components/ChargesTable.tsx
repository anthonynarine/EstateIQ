// # Filename: src/features/billing/components/ChargesTable.tsx

// ✅ New Code

import type { LeaseLedgerCharge, MoneyValue } from "../api/billingTypes";

/**
 * ChargesTableProps
 *
 * Public props contract for the lease-ledger charges table.
 */
export interface ChargesTableProps {
  charges?: LeaseLedgerCharge[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into a USD display string.
 *
 * @param value - Monetary value from the billing read model.
 * @returns A formatted USD currency string or placeholder.
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
 * formatDateValue
 *
 * Converts a raw date string into a readable localized date.
 *
 * @param value - Date-like string from the billing payload.
 * @returns A readable date label or placeholder.
 */
function formatDateValue(value?: string | null): string {
  if (!value?.trim()) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * formatChargeKindLabel
 *
 * Converts a backend charge kind into a human-readable label.
 *
 * @param kind - Raw charge kind value.
 * @returns A display-safe label.
 */
function formatChargeKindLabel(kind: string): string {
  const normalizedKind = kind.trim();

  if (!normalizedKind) {
    return "Unknown";
  }

  return normalizedKind
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * formatChargeStatusLabel
 *
 * Converts a backend charge status into a human-readable label.
 *
 * @param status - Raw charge status value.
 * @returns A display-safe label.
 */
function formatChargeStatusLabel(status?: string): string {
  const normalizedStatus = status?.trim();

  if (!normalizedStatus) {
    return "Unknown";
  }

  return normalizedStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * buildChargeStatusBadgeClasses
 *
 * Returns styling for the charge workflow status badge.
 *
 * @param status - Charge workflow status.
 * @returns A Tailwind class string.
 */
function buildChargeStatusBadgeClasses(status?: string): string {
  if (status === "void") {
    return "border border-rose-400/20 bg-rose-400/10 text-rose-100";
  }

  if (status === "posted") {
    return "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
  }

  return "border border-white/10 bg-white/5 text-slate-200";
}

/**
 * buildOverdueBadgeClasses
 *
 * Returns styling for the overdue badge.
 *
 * @param isOverdue - Backend-derived overdue flag.
 * @returns A Tailwind class string.
 */
function buildOverdueBadgeClasses(isOverdue?: boolean): string {
  if (isOverdue) {
    return "border border-amber-400/20 bg-amber-400/10 text-amber-100";
  }

  return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
}

/**
 * renderTableBody
 *
 * Renders loading, empty, or populated charge rows.
 *
 * Important:
 * Remaining balance and overdue state are backend-derived. This component
 * only displays those values.
 *
 * @param charges - Charge rows from the lease ledger payload.
 * @param isLoading - Whether the table is currently loading.
 * @param emptyMessage - Empty state message.
 * @returns Table body markup.
 */
function renderTableBody(
  charges: LeaseLedgerCharge[],
  isLoading: boolean,
  emptyMessage: string,
) {
  if (isLoading) {
    return (
      <tbody>
        <tr>
          <td
            className="px-4 py-10 text-center text-sm text-slate-400"
            colSpan={7}
          >
            Loading charges...
          </td>
        </tr>
      </tbody>
    );
  }

  if (!charges.length) {
    return (
      <tbody>
        <tr>
          <td
            className="px-4 py-10 text-center text-sm text-slate-400"
            colSpan={7}
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-white/5">
      {charges.map((charge) => {
        return (
          <tr
            key={String(charge.id)}
            className="transition hover:bg-white/[0.03]"
          >
            <td className="px-4 py-4 align-top text-sm text-slate-200">
              <div className="font-medium text-white">
                {formatChargeKindLabel(charge.kind)}
              </div>

              {charge.notes ? (
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                  {charge.notes}
                </p>
              ) : null}
            </td>

            <td className="px-4 py-4 align-top text-sm text-slate-300">
              {formatDateValue(charge.due_date)}
            </td>

            <td className="px-4 py-4 align-top text-sm text-slate-300">
              {formatDateValue(charge.charge_month)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-white">
              {formatCurrencyValue(charge.amount)}
            </td>

            <td className="px-4 py-4 align-top text-sm text-slate-300">
              {formatCurrencyValue(charge.remaining_balance)}
            </td>

            <td className="px-4 py-4 align-top text-sm">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${buildChargeStatusBadgeClasses(
                  charge.status,
                )}`}
              >
                {formatChargeStatusLabel(charge.status)}
              </span>
            </td>

            <td className="px-4 py-4 align-top text-sm">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${buildOverdueBadgeClasses(
                  charge.is_overdue,
                )}`}
              >
                {charge.is_overdue ? "Overdue" : "Current"}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

/**
 * ChargesTable
 *
 * Presentational table for displaying lease-level charge rows inside the
 * billing ledger page.
 *
 * Responsibilities:
 * - render backend-derived charge rows
 * - show amount, remaining balance, status, and overdue state
 * - handle loading and empty states
 *
 * @param props - Charges table props.
 * @returns A styled responsive charges table.
 */
export default function ChargesTable({
  charges = [],
  isLoading = false,
  emptyMessage = "No charges have been posted for this lease yet.",
}: ChargesTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Charges</h2>
          <p className="mt-1 text-sm text-slate-400">
            Posted obligations and remaining balances for this lease.
          </p>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {isLoading
            ? "Loading"
            : `${charges.length} row${charges.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.02]">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Kind
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Due Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Charge Month
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Amount
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Remaining
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Aging
              </th>
            </tr>
          </thead>

          {renderTableBody(charges, isLoading, emptyMessage)}
        </table>
      </div>
    </section>
  );
}