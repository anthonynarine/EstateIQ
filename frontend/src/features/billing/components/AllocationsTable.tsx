// # Filename: src/features/billing/components/AllocationsTable.tsx

import type { LeaseLedgerAllocation, MoneyValue } from "../api/billingTypes";

/**
 * LedgerTableVariant
 *
 * Controls whether the table renders as a full standalone card or as
 * an embeddable renderer inside a parent shell.
 */
type LedgerTableVariant = "standalone" | "embedded";

/**
 * AllocationsTableProps
 *
 * Public props contract for the lease-ledger allocations table.
 */
export interface AllocationsTableProps {
  allocations?: LeaseLedgerAllocation[];
  isLoading?: boolean;
  emptyMessage?: string;
  variant?: LedgerTableVariant;
}

/**
 * DESKTOP_TABLE_CELL_CLASS
 *
 * Shared desktop body cell spacing so the row rhythm matches the Payments view.
 */
const DESKTOP_TABLE_CELL_CLASS = "px-5 py-4 align-top text-sm";

/**
 * DESKTOP_TABLE_HEADER_CLASS
 *
 * Shared desktop header cell styling for ledger tables.
 */
const DESKTOP_TABLE_HEADER_CLASS =
  "px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500";

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into a USD display string.
 *
 * @param value Monetary value from the billing read model.
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
 * @param value Date-like string from the billing payload.
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
 * formatIdentifierValue
 *
 * Formats a payment or charge identifier for display.
 *
 * @param value Identifier-like value.
 * @returns Display-safe identifier string.
 */
function formatIdentifierValue(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `#${String(value)}`;
}

/**
 * renderIdentifierBadge
 *
 * Renders a subtle neutral badge for identifiers.
 *
 * Using the same badge language as the Payments method column helps the
 * allocation rows land at the same visual height.
 *
 * @param value Identifier-like value.
 * @returns Badge markup.
 */
function renderIdentifierBadge(value: string | number | null | undefined) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-300">
      {formatIdentifierValue(value)}
    </span>
  );
}

/**
 * renderAllocationsDesktopTable
 *
 * Renders the desktop table view.
 *
 * Important:
 * - Uses fixed column widths so the ledger tab switch feels stable.
 * - Uses badge-style identifiers so row height matches the Payments view more closely.
 *
 * @param allocations Visible allocation rows.
 * @returns Desktop table markup.
 */
function renderAllocationsDesktopTable(allocations: LeaseLedgerAllocation[]) {
  return (
    <div className="hidden md:block">
      <table className="min-w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col className="w-[30%]" />
        </colgroup>

        <thead className="bg-white/[0.02]">
          <tr className="text-left">
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Created</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Payment</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Charge</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Amount</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/80">
          {allocations.map((allocation) => {
            return (
              <tr
                key={String(allocation.id)}
                className="transition hover:bg-white/[0.02]"
              >
                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatDateValue(allocation.created_at)}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
                  {renderIdentifierBadge(allocation.payment_id)}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
                  {renderIdentifierBadge(allocation.charge_id)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap font-medium text-white`}
                >
                  {formatCurrencyValue(allocation.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * renderAllocationsMobileCards
 *
 * Renders the mobile card view.
 *
 * @param allocations Visible allocation rows.
 * @returns Mobile card markup.
 */
function renderAllocationsMobileCards(allocations: LeaseLedgerAllocation[]) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {allocations.map((allocation) => {
        return (
          <article
            key={String(allocation.id)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Created
                </p>
                <p className="mt-1 text-sm text-white">
                  {formatDateValue(allocation.created_at)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Amount
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrencyValue(allocation.amount)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Payment
                </p>
                <p className="mt-1 text-sm text-neutral-300">
                  {formatIdentifierValue(allocation.payment_id)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Charge
                </p>
                <p className="mt-1 text-sm text-neutral-300">
                  {formatIdentifierValue(allocation.charge_id)}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * renderAllocationsContent
 *
 * Renders loading, empty, or populated allocation content.
 *
 * Important:
 * This component trusts the backend-derived allocation trail and does not
 * attempt to infer or rebuild allocations from payments and charges.
 *
 * @param allocations Visible allocation rows.
 * @param isLoading Whether the table is currently loading.
 * @param emptyMessage Optional custom empty-state message.
 * @returns Allocation content markup.
 */
function renderAllocationsContent(
  allocations: LeaseLedgerAllocation[],
  isLoading: boolean,
  emptyMessage: string,
) {
  if (isLoading) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        Loading allocations…
      </div>
    );
  }

  if (!allocations.length) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {renderAllocationsDesktopTable(allocations)}
      {renderAllocationsMobileCards(allocations)}
    </>
  );
}

/**
 * AllocationsTable
 *
 * Presentational table for displaying the allocation trail inside the lease
 * ledger page.
 *
 * Responsibilities:
 * - render backend-derived allocation rows
 * - show the payment-to-charge application trail
 * - keep spacing and row rhythm aligned with the Payments table
 * - support standalone and embeddable rendering
 *
 * @param props Allocations table configuration and data.
 * @returns A styled responsive allocations table.
 */
export default function AllocationsTable({
  allocations = [],
  isLoading = false,
  emptyMessage = "No allocations have been created for this lease yet.",
  variant = "standalone",
}: AllocationsTableProps) {
  const content = renderAllocationsContent(
    allocations,
    isLoading,
    emptyMessage,
  );

  if (variant === "embedded") {
    return content;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-2 border-b border-neutral-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Allocations</h2>
          <p className="mt-1 text-sm text-neutral-400">
            The payment-to-charge application trail for this lease.
          </p>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          {isLoading
            ? "Loading"
            : `${allocations.length} allocation${allocations.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {content}
    </section>
  );
}