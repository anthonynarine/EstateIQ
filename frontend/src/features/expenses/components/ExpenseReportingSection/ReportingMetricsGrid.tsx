// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingMetricsGrid.tsx

// ✅ New Code

import type { ExpenseDashboardMetric } from "../../api/expensesTypes";
import { formatCurrency, formatNumber } from "./reportingFormatters";
import { isMoneyMetric } from "./reportingSelectors";

/**
 * Props for the ReportingMetricsGrid component.
 */
interface ReportingMetricsGridProps {
  metrics: ExpenseDashboardMetric[];
}

type MetricTone = "neutral" | "positive" | "negative";

/**
 * Resolves the display tone for a metric trend direction.
 *
 * @param trendDirection Optional trend direction from the backend.
 * @returns A safe tone for badge styling.
 */
function getMetricTone(
  trendDirection?: ExpenseDashboardMetric["trend_direction"],
): MetricTone {
  // # Step 1: Normalize the trend direction for safe comparison.
  const normalizedDirection = String(trendDirection ?? "").toLowerCase();

  // # Step 2: Map common upward language to a positive tone.
  if (
    normalizedDirection === "up" ||
    normalizedDirection === "increase" ||
    normalizedDirection === "positive"
  ) {
    return "positive";
  }

  // # Step 3: Map common downward language to a negative tone.
  if (
    normalizedDirection === "down" ||
    normalizedDirection === "decrease" ||
    normalizedDirection === "negative"
  ) {
    return "negative";
  }

  // # Step 4: Fall back to a neutral tone.
  return "neutral";
}

/**
 * Returns the Tailwind badge classes for a given metric tone.
 *
 * @param tone Visual tone for the badge.
 * @returns Tailwind class string.
 */
function getToneClasses(tone: MetricTone): string {
  // # Step 1: Return subtle positive styling.
  if (tone === "positive") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }

  // # Step 2: Return subtle negative styling.
  if (tone === "negative") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  }

  // # Step 3: Return neutral styling by default.
  return "border-neutral-800 bg-neutral-900 text-neutral-300";
}

/**
 * Formats a metric value based on whether it represents money.
 *
 * @param value Metric numeric value.
 * @param shouldFormatAsMoney Whether currency formatting should be used.
 * @returns Formatted metric value.
 */
function formatMetricValue(
  value: number,
  shouldFormatAsMoney: boolean,
): string {
  // # Step 1: Format financial metrics as currency.
  if (shouldFormatAsMoney) {
    return formatCurrency(value);
  }

  // # Step 2: Format non-financial metrics as numbers.
  return formatNumber(value);
}

/**
 * ReportingMetricsGrid
 *
 * Renders dashboard summary metrics for the Expenses reporting surface.
 *
 * Responsibilities:
 * - display normalized dashboard metrics
 * - format money-like values correctly
 * - render compact dark summary cards
 *
 * Non-responsibilities:
 * - fetching data
 * - deriving metrics from raw API payloads
 * - loading/error/empty state orchestration
 *
 * @param props Component props.
 * @returns A responsive grid of reporting metric cards.
 */
export default function ReportingMetricsGrid({
  metrics,
}: ReportingMetricsGridProps) {
  // # Step 1: Render a dark empty state when no metrics exist.
  if (!metrics.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/70 px-4 py-5 sm:px-5">
        <p className="text-sm text-neutral-400">
          Dashboard summary metrics are not available for the current reporting
          view.
        </p>
      </div>
    );
  }

  // # Step 2: Render the reporting metrics grid.
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {metrics.map((metric) => {
        const shouldFormatAsMoney = isMoneyMetric(metric);
        const tone = getMetricTone(metric.trend_direction);
        const toneClasses = getToneClasses(tone);
        const hasChange =
          metric.change !== undefined && metric.change !== null;
        const hasTrend = Boolean(metric.trend_direction);

        return (
          <article
            key={metric.key}
            className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          >
            <div className="flex min-h-[144px] flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Summary Metric
                    </p>

                    <h3 className="mt-2 text-sm font-medium text-neutral-300">
                      {metric.label}
                    </h3>
                  </div>

                  <span className="inline-flex shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                    {shouldFormatAsMoney ? "Currency" : "Count"}
                  </span>
                </div>

                <div>
                  <p className="text-3xl font-semibold tracking-tight text-white">
                    {formatMetricValue(metric.value, shouldFormatAsMoney)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasChange ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}
                  >
                    Change:{" "}
                    {formatMetricValue(
                      metric.change as number,
                      shouldFormatAsMoney,
                    )}
                  </span>
                ) : null}

                {hasTrend ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${toneClasses}`}
                  >
                    Trend: {metric.trend_direction}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}