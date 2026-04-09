// # Filename: src/features/billing/components/PaymentsTable.tsx


import { useEffect, useMemo, useState } from "react";

import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";
import type { LeaseLedgerPayment, MoneyValue } from "../api/billingTypes";

/**
 * PaymentsTableProps
 *
 * Public props contract for the payments table.
 */
export interface PaymentsTableProps {
  payments: LeaseLedgerPayment[];
  isLoading?: boolean;
}

/**
 * PAYMENTS_PAGE_SIZE
 *
 * Section-level page size for payment rows.
 */
const PAYMENTS_PAGE_SIZE = 1;

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into USD display text.
 *
 * @param value Monetary value from the billing read model.
 * @returns A formatted currency string or a placeholder.
 */
function formatCurrencyValue(value?: MoneyValue): string {
  // Step 1: Guard empty values
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  // Step 2: Parse safely
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "—";
  }

  // Step 3: Return currency text
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

/**
 * formatDateValue
 *
 * Formats an ISO date or datetime string into a readable date label.
 *
 * @param value Date-like API value.
 * @returns A display-safe date string.
 */
function formatDateValue(value?: string): string {
  // Step 1: Guard empty values
  if (!value?.trim()) {
    return "—";
  }

  // Step 2: Parse the date
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // Step 3: Return compact localized date text
  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * formatPaymentMethod
 *
 * Converts a payment method enum-like value into readable text.
 *
 * @param method Raw payment method value.
 * @returns Human-friendly label.
 */
function formatPaymentMethod(method?: string): string {
  // Step 1: Guard empty values
  if (!method?.trim()) {
    return "—";
  }

  // Step 2: Normalize enum-style text
  return method
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * buildPaymentKey
 *
 * Builds a stable React key for payment rows.
 *
 * @param payment Payment row.
 * @param index Array index fallback.
 * @returns A stable key string.
 */
function buildPaymentKey(
  payment: LeaseLedgerPayment,
  index: number,
): string {
  // Step 1: Prefer authoritative id
  if (payment.id !== null && payment.id !== undefined) {
    return String(payment.id);
  }

  // Step 2: Fall back to a deterministic composite
  return `payment-${payment.paid_at}-${index}`;
}

/**
 * PaymentsTable
 *
 * Presentational table for lease ledger payments.
 *
 * Responsibilities:
 * - display lease-scoped payment rows
 * - show backend-derived amount, allocated total, and unapplied amount
 * - paginate long historical payment activity at the section level
 * - provide mobile and desktop-friendly rendering
 *
 * Important architectural boundary:
 * This component does not fetch data or recompute ledger truth.
 * It only renders the payment rows supplied by the page/query layer.
 *
 * @param props Payment table display props.
 * @returns A responsive payments table surface.
 */
export default function PaymentsTable({
  payments,
  isLoading = false,
}: PaymentsTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(payments.length / PAYMENTS_PAGE_SIZE),
  );

  const visiblePayments = useMemo(() => {
    const startIndex = (page - 1) * PAYMENTS_PAGE_SIZE;
    const endIndex = startIndex + PAYMENTS_PAGE_SIZE;

    return payments.slice(startIndex, endIndex);
  }, [payments, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-white">Payments</h3>
          <p className="mt-1 text-sm text-neutral-400">
            Loading lease payment activity…
          </p>
        </div>

        <div className="space-y-3 p-5 sm:p-6">
          {[0, 1, 2].map((index) => {
            return (
              <div
                key={`payment-skeleton-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-48 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-24 animate-pulse rounded bg-white/10" />
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (!payments.length) {
    return (
      <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-white">Payments</h3>
          <p className="mt-1 text-sm text-neutral-400">
            No payments have been recorded for this lease yet.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
            <p className="text-sm font-medium text-white">
              No lease payments recorded
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Once payments are recorded, this table will show the payment date,
              method, allocated value, and any unapplied remainder.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Payments</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Recorded receipts for this lease, including how much remains
              unapplied.
            </p>
          </div>

          <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-neutral-800/80">
          <thead className="bg-white/[0.02]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Paid On
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Allocated
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Unapplied
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Reference / Notes
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-800/80">
            {visiblePayments.map((payment, index) => {
              return (
                <tr
                  key={buildPaymentKey(payment, index)}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 text-sm text-white">
                    {formatDateValue(payment.paid_at)}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-300">
                      {formatPaymentMethod(payment.method)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {formatCurrencyValue(payment.amount)}
                  </td>

                  <td className="px-6 py-4 text-sm text-neutral-300">
                    {formatCurrencyValue(payment.allocated_total)}
                  </td>

                  <td className="px-6 py-4 text-sm text-neutral-300">
                    {formatCurrencyValue(payment.unapplied_amount)}
                  </td>

                  <td className="px-6 py-4 text-sm text-neutral-300">
                    <div className="space-y-1">
                      <p>{payment.external_ref?.trim() || "—"}</p>
                      {payment.notes?.trim() ? (
                        <p className="max-w-md text-xs leading-5 text-neutral-500">
                          {payment.notes}
                        </p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-5 sm:p-6 lg:hidden">
        {visiblePayments.map((payment, index) => {
          return (
            <article
              key={buildPaymentKey(payment, index)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Paid On
                  </p>
                  <p className="text-sm font-medium text-white">
                    {formatDateValue(payment.paid_at)}
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-300">
                  {formatPaymentMethod(payment.method)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    Amount
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrencyValue(payment.amount)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    Allocated
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrencyValue(payment.allocated_total)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    Unapplied
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrencyValue(payment.unapplied_amount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    Reference
                  </p>
                  <p className="mt-1 text-sm text-neutral-300">
                    {payment.external_ref?.trim() || "—"}
                  </p>
                </div>

                {payment.notes?.trim() ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      {payment.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && payments.length > PAYMENTS_PAGE_SIZE ? (
        <CollectionPaginationFooter
          page={page}
          pageSize={PAYMENTS_PAGE_SIZE}
          totalCount={payments.length}
          itemLabel="payment"
          onPrevious={() => setPage((previous) => Math.max(1, previous - 1))}
          onNext={() =>
            setPage((previous) => Math.min(totalPages, previous + 1))
          }
        />
      ) : null}
    </section>
  );
}