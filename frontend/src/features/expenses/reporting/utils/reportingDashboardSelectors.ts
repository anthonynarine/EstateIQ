// # Filename: src/features/expenses/reporting/utils/reportingDashboardSelectors.ts


import type {
  ExpenseDashboardMetric,
  ExpenseDashboardResponse,
} from "../../api/expensesTypes";
import { reportDebug } from "./reportingDebug";
import { toSafeNumber } from "./reportingNumberUtils";
import { getDashboardSummarySource } from "./reportingPayloadUtils";

/**
 * Normalized dashboard metric used by reporting UI components.
 */
export interface ReportingDashboardMetric {
  key: string;
  label: string;
  value: number;
  change?: number | null;
  trend_direction?: ExpenseDashboardMetric["trend_direction"];
}

/**
 * Normalizes a backend dashboard metric into UI-safe numeric values.
 *
 * @param metric Raw dashboard metric.
 * @returns Normalized dashboard metric.
 */
export function normalizeDashboardMetric(
  metric: ExpenseDashboardMetric,
): ReportingDashboardMetric {
  // # Step 1: Normalize the backend metric into a UI-safe numeric shape.
  return {
    key: metric.key,
    label: metric.label,
    value: toSafeNumber(metric.value),
    change:
      metric.change === undefined || metric.change === null
        ? null
        : toSafeNumber(metric.change),
    trend_direction: metric.trend_direction,
  };
}

/**
 * Extracts dashboard metrics in a UI-friendly card format.
 *
 * Strategy:
 * - prefer backend-provided `metrics`
 * - otherwise synthesize from known dashboard summary fields
 *
 * @param dashboard Dashboard payload from the reporting API.
 * @returns Normalized dashboard metrics for card rendering.
 */
export function getDashboardMetrics(
  dashboard?: ExpenseDashboardResponse | null,
): ReportingDashboardMetric[] {
  // # Step 1: Return an empty list if no dashboard payload exists.
  if (!dashboard) {
    reportDebug("dashboard raw", dashboard);

    return [];
  }

  reportDebug("dashboard raw", dashboard);

  // # Step 2: Prefer backend-provided metrics when available.
  if (Array.isArray(dashboard.metrics) && dashboard.metrics.length > 0) {
    const normalizedMetrics = dashboard.metrics.map(normalizeDashboardMetric);

    reportDebug("dashboard normalized metrics", normalizedMetrics);

    return normalizedMetrics;
  }

  // # Step 3: Build safe fallback metrics from known summary fields.
  const summarySource = getDashboardSummarySource(dashboard);
  const fallbackMetrics: ReportingDashboardMetric[] = [];

  if (
    summarySource.total_expenses !== undefined ||
    summarySource.total_expense_amount !== undefined
  ) {
    fallbackMetrics.push({
      key: "total_expenses",
      label: "Total Expenses",
      value: toSafeNumber(
        summarySource.total_expenses ?? summarySource.total_expense_amount,
      ),
    });
  }

  if (
    summarySource.expense_count !== undefined ||
    summarySource.active_expense_count !== undefined
  ) {
    fallbackMetrics.push({
      key: "expense_count",
      label: "Expense Count",
      value: toSafeNumber(
        summarySource.expense_count ?? summarySource.active_expense_count,
      ),
    });
  }

  if (summarySource.current_month_total !== undefined) {
    fallbackMetrics.push({
      key: "current_month_total",
      label: "Current Month",
      value: toSafeNumber(summarySource.current_month_total),
    });
  }

  if (summarySource.year_to_date_total !== undefined) {
    fallbackMetrics.push({
      key: "year_to_date_total",
      label: "Year to Date",
      value: toSafeNumber(summarySource.year_to_date_total),
    });
  }

  if (summarySource.average_expense_amount !== undefined) {
    fallbackMetrics.push({
      key: "average_expense_amount",
      label: "Average Expense",
      value: toSafeNumber(summarySource.average_expense_amount),
    });
  }

  reportDebug("dashboard normalized metrics", fallbackMetrics);

  return fallbackMetrics;
}

/**
 * Determines whether a reporting metric should be rendered as money.
 *
 * This supports both raw backend metrics and normalized reporting metrics
 * so existing UI imports do not break during the refactor.
 *
 * @param metric Dashboard metric-like object.
 * @returns True when the metric is money-like.
 */
export function isMoneyMetric(
  metric: Pick<ExpenseDashboardMetric, "key" | "label"> |
    Pick<ReportingDashboardMetric, "key" | "label">,
): boolean {
  // # Step 1: Normalize searchable text from the metric contract.
  const normalizedKey = String(metric.key ?? "").toLowerCase();
  const normalizedLabel = String(metric.label ?? "").toLowerCase();

  // # Step 2: Check explicit financial key patterns first.
  if (
    normalizedKey.includes("amount") ||
    normalizedKey.includes("total") ||
    normalizedKey.includes("cost") ||
    normalizedKey.includes("expense")
  ) {
    return true;
  }

  // # Step 3: Fall back to label-based heuristics.
  return (
    normalizedLabel.includes("amount") ||
    normalizedLabel.includes("total") ||
    normalizedLabel.includes("cost") ||
    normalizedLabel.includes("expense") ||
    normalizedLabel.includes("month") ||
    normalizedLabel.includes("year to date") ||
    normalizedLabel.includes("average")
  );
}