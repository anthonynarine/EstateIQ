// # Filename: src/features/billing/components/LeaseLedgerSummaryCards.tsx


import type { LeaseLedgerTotals, MoneyValue } from "../api/billingTypes";

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
 * SummaryCardItem
 *
 * Internal presentational shape used to render a single summary card.
 */
interface SummaryCardItem {
  key: string;
  title: string;
  value: string;
  description: string;
}

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into a USD currency display string.
 *
 * Why this helper matters:
 * The billing backend may return decimals as strings. This component should
 * display them consistently without pushing formatting logic into the page.
 *
 * @param value - Monetary value from the ledger totals payload.
 * @returns A formatted USD string or a placeholder when missing/invalid.
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
 * buildSummaryCardItems
 *
 * Maps backend ledger totals into a stable card list for presentation.
 *
 * Important architectural boundary:
 * These values are backend-derived. We do not recalculate ledger truth in
 * the browser. This component only formats and displays the totals payload.
 *
 * @param totals - Lease ledger totals payload from the backend.
 * @returns A list of summary card items for rendering.
 */
function buildSummaryCardItems(totals?: LeaseLedgerTotals): SummaryCardItem[] {
  return [
    {
      key: "outstanding-balance",
      title: "Outstanding Balance",
      value: formatCurrencyValue(totals?.outstanding_balance),
      description: "Current backend-derived lease balance.",
    },
    {
      key: "total-charges",
      title: "Total Charges",
      value: formatCurrencyValue(totals?.total_charges),
      description: "All posted charges recorded for this lease.",
    },
    {
      key: "total-payments",
      title: "Total Payments",
      value: formatCurrencyValue(totals?.total_payments),
      description: "Payments recorded against this lease.",
    },
    {
      key: "unapplied-amount",
      title: "Unapplied Amount",
      value: formatCurrencyValue(totals?.unapplied_amount),
      description: "Payment value not yet applied to charges.",
    },
  ];
}

/**
 * LeaseLedgerSummaryCards
 *
 * Presentational summary card grid for the lease ledger page.
 *
 * Responsibilities:
 * - display backend-derived totals
 * - render stable placeholders while loading
 * - keep summary presentation logic out of the page component
 *
 * Important architectural boundary:
 * This component does not fetch data, mutate records, or recompute billing
 * math. It only renders the totals payload supplied by the query/page layer.
 *
 * @param props - Summary card display props.
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
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {summaryCards.map((card) => {
        return (
          <article
            key={card.key}
            className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-sm backdrop-blur-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {card.title}
            </p>

            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {isLoading ? "Loading..." : card.value}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {card.description}
            </p>
          </article>
        );
      })}
    </section>
  );
}