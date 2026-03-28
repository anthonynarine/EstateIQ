// # Filename: src/features/expenses/reporting/components/ReportingKpiStrip.tsx



import { formatCurrency, formatNumber } from "../utils/reportingFormatters";
import {
  isMoneyMetric,
  type ReportingDashboardMetric,
} from "../utils/reportingSelectors";

/**
 * Props for the ReportingKpiStrip component.
 */
interface ReportingKpiStripProps {
  metrics: ReportingDashboardMetric[];
  maxVisible?: number;
}

/**
 * Formats a normalized reporting metric for display.
 *
 * @param metric Normalized dashboard metric.
 * @returns Formatted metric value.
 */
function formatMetricValue(metric: ReportingDashboardMetric): string {
  // # Step 1: Format money-like metrics as currency.
  if (isMoneyMetric(metric)) {
    return formatCurrency(metric.value);
  }

  // # Step 2: Format non-money metrics as numbers.
  return formatNumber(metric.value);
}

/**
 * Renders a compact KPI strip for the reporting workspace.
 *
 * Responsibilities:
 * - keep the top of reporting visually light
 * - display normalized metrics only
 * - support sparse datasets without looking broken
 *
 * Non-responsibilities:
 * - fetching data
 * - payload normalization
 * - page-level orchestration
 *
 * @param props Component props.
 * @returns Compact reporting KPI strip.
 */
export default function ReportingKpiStrip({
  metrics,
  maxVisible = 4,
}: ReportingKpiStripProps) {
  // # Step 1: Limit how many metrics appear so the strip stays compact.
  const visibleMetrics = metrics.slice(0, maxVisible);

  // # Step 2: Render a quiet empty state when no metrics are available.
  if (!visibleMetrics.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 px-4 py-4">
        <p className="text-sm text-neutral-400">
          Summary metrics are not available for the current reporting view.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Reporting summary metrics"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {visibleMetrics.map((metric) => (
        <article
          key={metric.key}
          className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Summary Metric
                </p>

                <h3 className="mt-2 text-sm font-medium text-neutral-300">
                  {metric.label}
                </h3>
              </div>

              <span className="inline-flex shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                {isMoneyMetric(metric) ? "Currency" : "Count"}
              </span>
            </div>

            <div>
              <p className="text-2xl font-semibold tracking-tight text-white">
                {formatMetricValue(metric)}
              </p>

              {metric.change !== null && metric.change !== undefined ? (
                <p className="mt-2 text-xs text-neutral-400">
                  Change:{" "}
                  {isMoneyMetric(metric)
                    ? formatCurrency(metric.change)
                    : formatNumber(metric.change)}
                </p>
              ) : null}

              {metric.trend_direction ? (
                <p className="mt-1 text-xs capitalize text-neutral-500">
                  Trend: {metric.trend_direction}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}