// # Filename: src/features/billing/components/LeaseLedgerSummaryCards.tsx


import type { LeaseLedgerTotals, MoneyValue } from "../api/types";

/**
 * LeaseLedgerSummaryCardsProps
 *
 * Public props contract for the lease ledger summary card component.
 */
export interface LeaseLedgerSummaryCardsProps {
  totals?: LeaseLedgerTotals;
  isLoading?: boolean;
}

/**
 * SummaryCardTone
 *
 * Visual emphasis options for summary cards.
 */
type SummaryCardTone = "default" | "danger" | "success" | "warning";

/**
 * SummaryCardItem
 *
 * Internal presentational shape used to render a single summary card.
 */
interface SummaryCardItem {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone?: SummaryCardTone;
}

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into a USD currency display string.
 *
 * @param value Monetary value from the ledger totals payload.
 * @returns A formatted USD string or a placeholder when missing/invalid.
 */
function formatCurrencyValue(value?: MoneyValue): string {
  // Step 1: Guard empty values
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  // Step 2: Parse numeric input safely
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "—";
  }

  // Step 3: Return display-safe USD text
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
 * buildSummaryCardItems
 *
 * Maps backend ledger totals into a quieter, easier-to-scan summary row.
 *
 * @param totals Lease ledger totals payload from the backend.
 * @returns A list of summary card items for rendering.
 */
function buildSummaryCardItems(totals?: LeaseLedgerTotals): SummaryCardItem[] {
  const outstandingBalance = getNumericMoneyValue(totals?.outstanding_balance);
  const unappliedAmount = getNumericMoneyValue(totals?.unapplied_amount);

  return [
    {
      key: "outstanding-balance",
      label: "Outstanding",
      value: formatCurrencyValue(totals?.outstanding_balance),
      helper:
        outstandingBalance && outstandingBalance > 0
          ? "Balance due"
          : "Fully paid",
      tone:
        outstandingBalance && outstandingBalance > 0 ? "danger" : "success",
    },
    {
      key: "total-charges",
      label: "Charges",
      value: formatCurrencyValue(totals?.total_charges),
      helper: "Posted to lease",
      tone: "default",
    },
    {
      key: "total-payments",
      label: "Payments",
      value: formatCurrencyValue(totals?.total_payments),
      helper: "Recorded receipts",
      tone: "default",
    },
    {
      key: "unapplied-amount",
      label: "Unapplied",
      value: formatCurrencyValue(totals?.unapplied_amount),
      helper:
        unappliedAmount && unappliedAmount > 0
          ? "Needs allocation"
          : "Fully allocated",
      tone:
        unappliedAmount && unappliedAmount > 0 ? "warning" : "default",
    },
  ];
}

/**
 * getCardToneClasses
 *
 * Resolves visual styling for a card tone.
 *
 * @param tone Desired card emphasis.
 * @returns Tailwind class string for card styling.
 */
function getCardToneClasses(tone: SummaryCardTone = "default"): string {
  switch (tone) {
    case "danger":
      return "border-rose-500/20 bg-neutral-950";
    case "success":
      return "border-emerald-500/20 bg-neutral-950";
    case "warning":
      return "border-amber-500/20 bg-neutral-950";
    case "default":
    default:
      return "border-neutral-800/80 bg-neutral-950";
  }
}

/**
 * getValueToneClasses
 *
 * Resolves text styling for the summary value.
 *
 * @param tone Desired card emphasis.
 * @returns Tailwind class string for value styling.
 */
function getValueToneClasses(tone: SummaryCardTone = "default"): string {
  switch (tone) {
    case "danger":
      return "text-rose-100";
    case "success":
      return "text-emerald-100";
    case "warning":
      return "text-amber-100";
    case "default":
    default:
      return "text-white";
  }
}

/**
 * LeaseLedgerSummaryCards
 *
 * Presentational summary card grid for the lease ledger page.
 *
 * @param props Summary card display props.
 * @returns A responsive grid of lease ledger summary cards.
 */
export default function LeaseLedgerSummaryCards({
  totals,
  isLoading = false,
}: LeaseLedgerSummaryCardsProps) {
  const summaryCards = buildSummaryCardItems(totals);

  return (
    <section
      aria-label="Lease ledger summary"
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
    >
      {summaryCards.map((card) => {
        return (
          <article
            key={card.key}
            className={`rounded-xl border px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${getCardToneClasses(
              card.tone,
            )}`}
          >
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {card.label}
              </p>

              {isLoading ? (
                <div className="space-y-1.5">
                  <div className="h-7 w-24 animate-pulse rounded bg-white/10" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-white/10" />
                </div>
              ) : (
                <>
                  <p
                    className={`text-[1.65rem] font-semibold tracking-tight ${getValueToneClasses(
                      card.tone,
                    )}`}
                  >
                    {card.value}
                  </p>

                  <p className="text-xs text-neutral-400">{card.helper}</p>
                </>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}