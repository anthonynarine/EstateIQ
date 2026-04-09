// # Filename: src/features/billing/components/AllocationsTable.tsx


import { useEffect, useMemo, useState } from "react";

import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";
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
 * ALLOCATIONS_PAGE_SIZE
 *
 * Section-level page size for allocation rows.
 */
const ALLOCATIONS_PAGE_SIZE = 1;

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
 * @param allocations Visible allocation rows for the current page.
 * @param isLoading Whether the table is currently loading.
 * @param emptyMessage Optional custom empty-state message.
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
            className="px-4 py-10 text-center text-sm text-neutral-400"
            colSpan={4}
          >
            Loading allocations…
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
            className="px-4 py-10 text-center text-sm text-neutral-400"
            colSpan={4}
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-neutral-800/80">
      {allocations.map((allocation) => {
        return (
          <tr
            key={String(allocation.id)}
            className="transition hover:bg-white/[0.02]"
          >
            <td className="px-4 py-4 align-top text-sm text-neutral-300">
              {formatDateValue(allocation.created_at)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-neutral-200">
              #{String(allocation.payment_id)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-neutral-200">
              #{String(allocation.charge_id)}
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
 * - paginate long history
 * - match the current EstateIQ theme
 *
 * @param props Allocations table configuration and data.
 * @returns A styled responsive allocations table.
 */
export default function AllocationsTable({
  allocations = [],
  isLoading = false,
  emptyMessage = "No allocations have been created for this lease yet.",
}: AllocationsTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(allocations.length / ALLOCATIONS_PAGE_SIZE),
  );

  const visibleAllocations = useMemo(() => {
    const startIndex = (page - 1) * ALLOCATIONS_PAGE_SIZE;
    const endIndex = startIndex + ALLOCATIONS_PAGE_SIZE;

    return allocations.slice(startIndex, endIndex);
  }, [allocations, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

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

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.02]">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Created
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Payment
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Charge
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Amount
              </th>
            </tr>
          </thead>

          {renderTableBody(visibleAllocations, isLoading, emptyMessage)}
        </table>
      </div>

      {!isLoading && allocations.length > ALLOCATIONS_PAGE_SIZE ? (
        <CollectionPaginationFooter
          page={page}
          pageSize={ALLOCATIONS_PAGE_SIZE}
          totalCount={allocations.length}
          itemLabel="allocation"
          onPrevious={() => setPage((previous) => Math.max(1, previous - 1))}
          onNext={() =>
            setPage((previous) => Math.min(totalPages, previous + 1))
          }
        />
      ) : null}
    </section>
  );
}