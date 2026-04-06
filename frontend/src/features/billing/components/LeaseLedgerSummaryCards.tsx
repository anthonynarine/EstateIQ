// # Filename: src/features/billing/components/LeaseLedgerSummaryCards.tsx
// ✅ New Code

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
 * SummaryCardTone
 *
 * Visual emphasis options for summary cards.
 */
type SummaryCardTone = "default" | "danger" | "success" | "muted";

/**
 * SummaryCardItem
 *
 * Internal presentational shape used to render a single summary card.
 */
interface SummaryCardItem {
  key: string;
  label: string;
  value: string;
  helper?: string;
  tone?: SummaryCardTone;
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
 * buildSummaryCardItems
 *
 * Maps backend ledger totals into a tighter, easier-to-scan summary row.
 *
 * Important architectural boundary:
 * These values are backend-derived. We do not recalculate ledger truth in
 * the browser. This component only formats and displays the totals payload.
 *
 * @param totals Lease ledger totals payload from the backend.
 * @returns A list of summary card items for rendering.
 */
function buildSummaryCardItems(totals?: LeaseLedgerTotals): SummaryCardItem[] {
  return [
    {
      key: "outstanding-balance",
      label: "Outstanding",
      value: formatCurrencyValue(totals?.outstanding_balance),
      helper: "Current lease balance",
      tone: "danger",
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
      tone: "success",
    },
    {
      key: "unapplied-amount",
      label: "Unapplied",
      value: formatCurrencyValue(totals?.unapplied_amount),
      helper: "Not yet allocated",
      tone: "muted",
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
  // Step 1: Map semantic tone to app-consistent styling
  switch (tone) {
    case "danger":
      return "border-rose-500/20 bg-rose-500/[0.06]";
    case "success":
      return "border-emerald-500/20 bg-emerald-500/[0.05]";
    case "muted":
      return "border-neutral-800/80 bg-neutral-950";
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
  // Step 1: Map tone to value emphasis
  switch (tone) {
    case "danger":
      return "text-rose-100";
    case "success":
      return "text-emerald-100";
    case "muted":
      return "text-white";
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
 * Responsibilities:
 * - display backend-derived totals
 * - render stable placeholders while loading
 * - keep summary presentation logic out of the page component
 *
 * Important architectural boundary:
 * This component does not fetch data, mutate records, or recompute billing
 * math. It only renders the totals payload supplied by the query/page layer.
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {summaryCards.map((card) => {
        return (
          <article
            key={card.key}
            className={`rounded-3xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${getCardToneClasses(
              card.tone,
            )}`}
          >
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {card.label}
              </p>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ) : (
                <>
                  <p
                    className={`text-2xl font-semibold tracking-tight ${getValueToneClasses(
                      card.tone,
                    )}`}
                  >
                    {card.value}
                  </p>

                  {card.helper ? (
                    <p className="text-sm text-neutral-400">{card.helper}</p>
                  ) : null}
                </>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}