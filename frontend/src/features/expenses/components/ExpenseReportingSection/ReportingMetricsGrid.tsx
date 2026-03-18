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

/**
 * ReportingMetricsGrid
 *
 * Renders dashboard summary metrics for the Expenses reporting surface.
 *
 * Responsibilities:
 * - display normalized dashboard metrics
 * - format money-like values correctly
 * - keep card rendering out of the reporting wrapper
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
  // # Step 1: Render a lightweight empty state when no metrics exist.
  if (!metrics.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Dashboard summary metrics are not available.
        </p>
      </div>
    );
  }

  // # Step 2: Render the reporting metrics grid.
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const shouldFormatAsMoney = isMoneyMetric(metric);

        return (
          <div
            key={metric.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm font-medium text-slate-600">{metric.label}</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {shouldFormatAsMoney
                ? formatCurrency(metric.value)
                : formatNumber(metric.value)}
            </p>

            {metric.change !== undefined && metric.change !== null ? (
              <p className="mt-2 text-xs text-slate-500">
                Change:{" "}
                {shouldFormatAsMoney
                  ? formatCurrency(metric.change)
                  : formatNumber(metric.change)}
              </p>
            ) : null}

            {metric.trend_direction ? (
              <p className="mt-1 text-xs capitalize text-slate-500">
                Trend: {metric.trend_direction}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}