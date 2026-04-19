// # Filename: src/features/billing/components/PaymentsTable.tsx

import type { LeaseLedgerPayment, MoneyValue } from "../api/types";

/**
 * LedgerTableVariant
 *
 * Controls whether the table renders as a full standalone card or as
 * an embeddable renderer inside a parent shell.
 */
type LedgerTableVariant = "standalone" | "embedded";

/**
 * PaymentsTableProps
 *
 * Public props contract for the payments table.
 */
export interface PaymentsTableProps {
  payments: LeaseLedgerPayment[];
  isLoading?: boolean;
  variant?: LedgerTableVariant;
}

/**
 * DESKTOP_TABLE_CELL_CLASS
 *
 * Shared desktop body cell spacing so the row rhythm stays consistent.
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
 * getPaymentReferenceValue
 *
 * Returns a clean display value for the external reference.
 *
 * @param payment Payment row.
 * @returns Display-safe reference text.
 */
function getPaymentReferenceValue(payment: LeaseLedgerPayment): string {
  return payment.external_ref?.trim() || "—";
}

/**
 * getPaymentNotesValue
 *
 * Returns a clean display value for payment notes.
 *
 * @param payment Payment row.
 * @returns Trimmed notes text or null.
 */
function getPaymentNotesValue(payment: LeaseLedgerPayment): string | null {
  if (!payment.notes?.trim()) {
    return null;
  }

  return payment.notes.trim();
}

/**
 * formatReferencePreview
 *
 * Converts raw system-like references into a shorter, friendlier preview.
 *
 * Strategy:
 * - split on colons
 * - drop obvious system markers like DEMO
 * - remove leading LEASE- prefix when present
 * - drop low-value markers like PRIMARY / SECONDARY
 * - keep only the first 2 most useful chunks
 *
 * The full raw value remains available on hover via the `title` attribute.
 *
 * @param reference Raw external reference.
 * @returns A compact UI-friendly preview.
 */
function formatReferencePreview(reference: string): string {
  if (reference === "—") {
    return reference;
  }

  const cleanedParts = reference
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const normalizedPart = part.toUpperCase();

      return !["DEMO", "PRIMARY", "SECONDARY"].includes(normalizedPart);
    })
    .map((part) => part.replace(/^LEASE-/i, ""));

  if (!cleanedParts.length) {
    return reference;
  }

  return cleanedParts.slice(0, 2).join(" · ");
}

/**
 * renderPaymentsDesktopTable
 *
 * Renders the desktop table view.
 *
 * Important:
 * - Uses fixed column widths so the tab feels stable when switching between
 *   Charges, Payments, and Allocations.
 * - Keeps the reference cell to a single display line so the table stays calm.
 * - Removes notes from the desktop row to reduce visual noise.
 *
 * @param payments Visible payment rows.
 * @returns Desktop table markup.
 */
function renderPaymentsDesktopTable(payments: LeaseLedgerPayment[]) {
  return (
    <div className="hidden lg:block">
      <table className="min-w-full table-fixed divide-y divide-neutral-800/80">
        <colgroup>
          <col className="w-[13%]" />
          <col className="w-[13%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[28%]" />
        </colgroup>

        <thead className="bg-white/[0.02]">
          <tr>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Paid On</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Method</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Amount</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Allocated</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Unapplied</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Reference</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/80">
          {payments.map((payment, index) => {
            const referenceValue = getPaymentReferenceValue(payment);
            const referencePreview = formatReferencePreview(referenceValue);

            return (
              <tr
                key={buildPaymentKey(payment, index)}
                className="transition hover:bg-white/[0.02]"
              >
                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-white`}
                >
                  {formatDateValue(payment.paid_at)}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-300">
                    {formatPaymentMethod(payment.method)}
                  </span>
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap font-medium text-white`}
                >
                  {formatCurrencyValue(payment.amount)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatCurrencyValue(payment.allocated_total)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatCurrencyValue(payment.unapplied_amount)}
                </td>

                <td className={`${DESKTOP_TABLE_CELL_CLASS} text-neutral-300`}>
                  <div className="w-full min-w-0 overflow-hidden">
                    <p
                      className="truncate text-[13px] font-medium text-neutral-200"
                      title={referenceValue}
                    >
                      {referencePreview}
                    </p>
                  </div>
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
 * renderPaymentsMobileCards
 *
 * Renders the mobile card view.
 *
 * On mobile we keep notes available because there is more vertical freedom
 * and the content is easier to scan in stacked form.
 *
 * @param payments Visible payment rows.
 * @returns Mobile card markup.
 */
function renderPaymentsMobileCards(payments: LeaseLedgerPayment[]) {
  return (
    <div className="space-y-4 p-4 lg:hidden">
      {payments.map((payment, index) => {
        const referenceValue = getPaymentReferenceValue(payment);
        const referencePreview = formatReferencePreview(referenceValue);
        const notesValue = getPaymentNotesValue(payment);

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
                <p className="mt-1 break-words text-sm text-neutral-300">
                  {referencePreview}
                </p>
              </div>

              {notesValue ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                    Notes
                  </p>
                  <p className="mt-1 text-sm leading-6 text-neutral-400">
                    {notesValue}
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * renderPaymentsContent
 *
 * Renders loading, empty, or populated payment content.
 *
 * @param payments Visible payment rows.
 * @param isLoading Whether the table is loading.
 * @returns Payments content markup.
 */
function renderPaymentsContent(
  payments: LeaseLedgerPayment[],
  isLoading: boolean,
) {
  if (isLoading) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        Loading payment activity…
      </div>
    );
  }

  if (!payments.length) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        No payments have been recorded for this lease yet.
      </div>
    );
  }

  return (
    <>
      {renderPaymentsDesktopTable(payments)}
      {renderPaymentsMobileCards(payments)}
    </>
  );
}

/**
 * PaymentsTable
 *
 * Presentational table for lease ledger payments.
 *
 * Responsibilities:
 * - display lease-scoped payment rows
 * - show backend-derived amount, allocated total, and unapplied amount
 * - keep desktop row rhythm aligned with the other ledger tabs
 * - present references in a compact, more human-readable way
 * - support standalone and embeddable rendering
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
  variant = "standalone",
}: PaymentsTableProps) {
  const content = renderPaymentsContent(payments, isLoading);

  if (variant === "embedded") {
    return content;
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

      {content}
    </section>
  );
}