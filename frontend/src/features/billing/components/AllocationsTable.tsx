// # Filename: src/features/billing/components/AllocationsTable.tsx


import type { LeaseLedgerAllocation, MoneyValue } from "../api/billingTypes";

/**
 * AllocationsTableProps
 *
 * Public props contract for the lease-ledger allocations table.
 */
export interface AllocationsTableProps {
  allocations?: LeaseLedgerAllocation[];
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
 * renderTableBody
 *
 * Renders the correct table body state:
 * - loading
 * - empty
 * - populated rows
 *
 * Important:
 * This component trusts the backend-derived allocation trail and does not
 * attempt to infer or rebuild allocations from payments and charges.
 *
 * @param allocations - Allocation rows from the lease ledger payload.
 * @param isLoading - Whether the table is currently loading.
 * @param emptyMessage - Optional custom empty-state message.
 * @returns Table body markup.
 */
function renderTableBody(
  allocations: LeaseLedgerAllocation[],
  isLoading: boolean,
  emptyMessage: string,
) {
  if (isLoading) {
    return (
      <tbody>
        <tr>
          <td
            className="px-4 py-10 text-center text-sm text-slate-400"
            colSpan={4}
          >
            Loading allocations...
          </td>
        </tr>
      </tbody>
    );
  }

  if (!allocations.length) {
    return (
      <tbody>
        <tr>
          <td
            className="px-4 py-10 text-center text-sm text-slate-400"
            colSpan={4}
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-white/5">
      {allocations.map((allocation) => {
        return (
          <tr
            key={String(allocation.id)}
            className="transition hover:bg-white/[0.03]"
          >
            <td className="px-4 py-4 align-top text-sm text-slate-300">
              {formatDateValue(allocation.created_at)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-slate-200">
              {String(allocation.payment_id)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-slate-200">
              {String(allocation.charge_id)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-white">
              {formatCurrencyValue(allocation.amount)}
            </td>
          </tr>
        );
      })}
    </tbody>
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
 * - handle loading and empty states
 *
 * Important architectural boundary:
 * This table does not fetch data, mutate allocations, or compute billing
 * math. It only renders the allocation rows supplied by the page/query layer.
 *
 * @param props - Allocations table configuration and data.
 * @returns A styled responsive allocations table.
 */
export default function AllocationsTable({
  allocations = [],
  isLoading = false,
  emptyMessage = "No allocations have been created for this lease yet.",
}: AllocationsTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Allocations</h2>
          <p className="mt-1 text-sm text-slate-400">
            The payment-to-charge application trail for this lease.
          </p>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {isLoading
            ? "Loading"
            : `${allocations.length} row${allocations.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.02]">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Created At
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Payment ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Charge ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Amount
              </th>
            </tr>
          </thead>

          {renderTableBody(allocations, isLoading, emptyMessage)}
        </table>
      </div>
    </section>
  );
}