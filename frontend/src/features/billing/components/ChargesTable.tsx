// # Filename: src/features/billing/components/ChargesTable.tsx


import { useEffect, useMemo, useState } from "react";

import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";
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
 * CHARGES_PAGE_SIZE
 *
 * Section-level page size for ledger charge rows.
 */
const CHARGES_PAGE_SIZE = 1;

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
 * getNumericMoneyValue
 *
 * Converts a money-like value into a safe number for UI state decisions.
 *
 * @param value Monetary value from the billing payload.
 * @returns Parsed numeric value or null.
 */
function getNumericMoneyValue(value?: MoneyValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
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
 * formatMonthValue
 *
 * Formats a charge-month date into a compact month/year label.
 *
 * @param value Charge month string.
 * @returns Compact month display or placeholder.
 */
function formatMonthValue(value?: string | null): string {
  if (!value?.trim()) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * formatChargeKindLabel
 *
 * Converts a backend charge kind into a human-readable label.
 *
 * @param kind Raw charge kind value.
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
 * getChargeDisplayState
 *
 * Builds a calmer, user-facing display state for a charge row.
 *
 * @param charge Charge row from the lease ledger payload.
 * @returns Display state label and classes.
 */
function getChargeDisplayState(charge: LeaseLedgerCharge): {
  label: string;
  classes: string;
} {
  const remainingBalance = getNumericMoneyValue(charge.remaining_balance);

  if (charge.status === "void") {
    return {
      label: "Void",
      classes: "border border-rose-400/20 bg-rose-400/10 text-rose-100",
    };
  }

  if (remainingBalance !== null && remainingBalance <= 0) {
    return {
      label: "Paid",
      classes:
        "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (charge.is_overdue) {
    return {
      label: "Overdue",
      classes:
        "border border-amber-400/20 bg-amber-400/10 text-amber-100",
    };
  }

  return {
    label: "Posted",
    classes: "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  };
}

/**
 * getChargeSecondaryText
 *
 * Produces one short supporting line for the charge row.
 *
 * @param charge Charge row from the billing payload.
 * @returns Short supporting text or null.
 */
function getChargeSecondaryText(charge: LeaseLedgerCharge): string | null {
  if (charge.charge_month) {
    return `For ${formatMonthValue(charge.charge_month)}`;
  }

  if (charge.notes?.trim()) {
    return charge.notes.trim();
  }

  return null;
}

/**
 * renderTableBody
 *
 * Renders loading, empty, or populated charge rows.
 *
 * @param charges Visible charge rows for the current page.
 * @param isLoading Whether the table is currently loading.
 * @param emptyMessage Empty state message.
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
            className="px-4 py-10 text-center text-sm text-neutral-400"
            colSpan={5}
          >
            Loading charges…
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
            className="px-4 py-10 text-center text-sm text-neutral-400"
            colSpan={5}
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-neutral-800/80">
      {charges.map((charge) => {
        const displayState = getChargeDisplayState(charge);
        const secondaryText = getChargeSecondaryText(charge);

        return (
          <tr
            key={String(charge.id)}
            className="transition hover:bg-white/[0.02]"
          >
            <td className="px-4 py-4 align-top text-sm text-neutral-200">
              <div className="font-medium text-white">
                {formatChargeKindLabel(charge.kind)}
              </div>

              {secondaryText ? (
                <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-500">
                  {secondaryText}
                </p>
              ) : null}
            </td>

            <td className="px-4 py-4 align-top text-sm text-neutral-300">
              {formatDateValue(charge.due_date)}
            </td>

            <td className="px-4 py-4 align-top text-sm font-medium text-white">
              {formatCurrencyValue(charge.amount)}
            </td>

            <td className="px-4 py-4 align-top text-sm text-neutral-300">
              {formatCurrencyValue(charge.remaining_balance)}
            </td>

            <td className="px-4 py-4 align-top text-sm">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${displayState.classes}`}
              >
                {displayState.label}
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
 * - show amount, remaining balance, and clear row state
 * - paginate long historical ledgers at the section level
 * - match the current EstateIQ theme
 *
 * @param props Charges table props.
 * @returns A styled responsive charges table.
 */
export default function ChargesTable({
  charges = [],
  isLoading = false,
  emptyMessage = "No charges have been posted for this lease yet.",
}: ChargesTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(charges.length / CHARGES_PAGE_SIZE));

  const visibleCharges = useMemo(() => {
    const startIndex = (page - 1) * CHARGES_PAGE_SIZE;
    const endIndex = startIndex + CHARGES_PAGE_SIZE;

    return charges.slice(startIndex, endIndex);
  }, [charges, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-2 border-b border-neutral-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Charges</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Posted obligations and remaining balances for this lease.
          </p>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          {isLoading
            ? "Loading"
            : `${charges.length} charge${charges.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.02]">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Charge
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Due Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Amount
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Remaining
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                State
              </th>
            </tr>
          </thead>

          {renderTableBody(visibleCharges, isLoading, emptyMessage)}
        </table>
      </div>

      {!isLoading && charges.length > CHARGES_PAGE_SIZE ? (
        <CollectionPaginationFooter
          page={page}
          pageSize={CHARGES_PAGE_SIZE}
          totalCount={charges.length}
          itemLabel="charge"
          onPrevious={() => setPage((previous) => Math.max(1, previous - 1))}
          onNext={() =>
            setPage((previous) => Math.min(totalPages, previous + 1))
          }
        />
      ) : null}
    </section>
  );
}