// # Filename: src/features/billing/components/ChargesTable.tsx

import type { LeaseLedgerCharge, MoneyValue } from "../api/billingTypes";

/**
 * LedgerTableVariant
 *
 * Controls whether the table renders as a full standalone card or as
 * an embeddable renderer inside a parent shell.
 */
type LedgerTableVariant = "standalone" | "embedded";

/**
 * ChargesTableProps
 *
 * Public props contract for the lease-ledger charges table.
 */
export interface ChargesTableProps {
  charges?: LeaseLedgerCharge[];
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
 * getChargeDesktopPreview
 *
 * Builds a compact one-line charge preview for desktop so row height matches
 * the Payments table.
 *
 * @param charge Charge row from the lease ledger payload.
 * @returns A compact preview string or null.
 */
function getChargeDesktopPreview(charge: LeaseLedgerCharge): string | null {
  if (charge.charge_month) {
    return formatMonthValue(charge.charge_month);
  }

  if (charge.notes?.trim()) {
    return charge.notes.trim();
  }

  return null;
}

/**
 * getChargeMobileSecondaryText
 *
 * Produces a slightly richer supporting line for mobile cards where there is
 * more vertical room.
 *
 * @param charge Charge row from the billing payload.
 * @returns Supporting text or null.
 */
function getChargeMobileSecondaryText(charge: LeaseLedgerCharge): string | null {
  if (charge.charge_month) {
    return `Rent charge for ${formatMonthValue(charge.charge_month)}`;
  }

  if (charge.notes?.trim()) {
    return charge.notes.trim();
  }

  return null;
}

/**
 * renderChargesDesktopTable
 *
 * Renders the desktop table view.
 *
 * Important:
 * - Keeps the Charge column to a single line plus state pill so the row height
 *   matches the Payments view more closely.
 * - Uses the same desktop padding rhythm as Payments.
 *
 * @param charges Visible charge rows.
 * @returns Desktop table markup.
 */
function renderChargesDesktopTable(charges: LeaseLedgerCharge[]) {
  return (
    <div className="hidden md:block">
      <table className="min-w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[19%]" />
          <col className="w-[17%]" />
          <col className="w-[19%]" />
          <col className="w-[15%]" />
        </colgroup>

        <thead className="bg-white/[0.02]">
          <tr className="text-left">
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Charge</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Due Date</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Amount</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Remaining</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>State</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/80">
          {charges.map((charge) => {
            const displayState = getChargeDisplayState(charge);
            const desktopPreview = getChargeDesktopPreview(charge);

            return (
              <tr
                key={String(charge.id)}
                className="transition hover:bg-white/[0.02]"
              >
                <td className={`${DESKTOP_TABLE_CELL_CLASS} text-neutral-200`}>
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <span className="truncate font-medium text-white">
                      {formatChargeKindLabel(charge.kind)}
                    </span>

                    {desktopPreview ? (
                      <span
                        className="truncate text-xs text-neutral-500"
                        title={desktopPreview}
                      >
                        · {desktopPreview}
                      </span>
                    ) : null}
                  </div>
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatDateValue(charge.due_date)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap font-medium text-white`}
                >
                  {formatCurrencyValue(charge.amount)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatCurrencyValue(charge.remaining_balance)}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
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
      </table>
    </div>
  );
}

/**
 * renderChargesMobileCards
 *
 * Renders the mobile card view.
 *
 * @param charges Visible charge rows.
 * @returns Mobile card markup.
 */
function renderChargesMobileCards(charges: LeaseLedgerCharge[]) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {charges.map((charge) => {
        const displayState = getChargeDisplayState(charge);
        const secondaryText = getChargeMobileSecondaryText(charge);

        return (
          <article
            key={String(charge.id)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatChargeKindLabel(charge.kind)}
                </p>

                {secondaryText ? (
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {secondaryText}
                  </p>
                ) : null}
              </div>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${displayState.classes}`}
              >
                {displayState.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Due Date
                </p>
                <p className="mt-1 text-sm text-white">
                  {formatDateValue(charge.due_date)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Amount
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrencyValue(charge.amount)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Remaining
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrencyValue(charge.remaining_balance)}
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
 * renderChargesContent
 *
 * Renders loading, empty, or populated charge content.
 *
 * @param charges Visible charge rows.
 * @param isLoading Whether the table is loading.
 * @param emptyMessage Empty state copy.
 * @returns Charges content markup.
 */
function renderChargesContent(
  charges: LeaseLedgerCharge[],
  isLoading: boolean,
  emptyMessage: string,
) {
  if (isLoading) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        Loading charges…
      </div>
    );
  }

  if (!charges.length) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {renderChargesDesktopTable(charges)}
      {renderChargesMobileCards(charges)}
    </>
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
 * - keep desktop row rhythm aligned with the Payments table
 * - support standalone and embeddable rendering
 *
 * @param props Charges table props.
 * @returns A styled charges table.
 */
export default function ChargesTable({
  charges = [],
  isLoading = false,
  emptyMessage = "No charges have been posted for this lease yet.",
  variant = "standalone",
}: ChargesTableProps) {
  const content = renderChargesContent(charges, isLoading, emptyMessage);

  if (variant === "embedded") {
    return content;
  }

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

      {content}
    </section>
  );
}