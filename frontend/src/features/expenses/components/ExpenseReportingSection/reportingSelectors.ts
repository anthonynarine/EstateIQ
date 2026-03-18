// # Filename: src/features/expenses/components/ExpenseReportingSection/reportingSelectors.ts



import type {
    ExpenseByBuildingPoint,
    ExpenseByBuildingResponse,
    ExpenseByCategoryPoint,
    ExpenseByCategoryResponse,
    ExpenseDashboardMetric,
    ExpenseDashboardResponse,
    ExpenseMonthlyTrendPoint,
    ExpenseMonthlyTrendResponse,
  } from "../../api/expensesTypes";
  
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
  ): ExpenseDashboardMetric[] {
    // # Step 1: Return an empty list if no dashboard payload exists.
    if (!dashboard) {
      return [];
    }
  
    // # Step 2: Prefer backend-provided metrics when available.
    if (Array.isArray(dashboard.metrics) && dashboard.metrics.length > 0) {
      return dashboard.metrics;
    }
  
    // # Step 3: Build safe fallback metrics from known summary fields.
    const fallbackMetrics: ExpenseDashboardMetric[] = [];
  
    if (dashboard.total_expenses !== undefined) {
      fallbackMetrics.push({
        key: "total_expenses",
        label: "Total Expenses",
        value: dashboard.total_expenses,
      });
    }
  
    if (dashboard.expense_count !== undefined) {
      fallbackMetrics.push({
        key: "expense_count",
        label: "Expense Count",
        value: dashboard.expense_count,
      });
    }
  
    if (dashboard.current_month_total !== undefined) {
      fallbackMetrics.push({
        key: "current_month_total",
        label: "Current Month",
        value: dashboard.current_month_total,
      });
    }
  
    if (dashboard.year_to_date_total !== undefined) {
      fallbackMetrics.push({
        key: "year_to_date_total",
        label: "Year to Date",
        value: dashboard.year_to_date_total,
      });
    }
  
    return fallbackMetrics;
  }
  
  /**
   * Extracts monthly trend points from the reporting payload.
   *
   * Supports either:
   * - payload.points
   * - payload.results
   *
   * @param payload Monthly trend API response.
   * @returns Normalized monthly trend points.
   */
  export function getMonthlyTrendPoints(
    payload?: ExpenseMonthlyTrendResponse | null,
  ): ExpenseMonthlyTrendPoint[] {
    // # Step 1: Return backend `points` when available.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when available.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Extracts category breakdown points from the reporting payload.
   *
   * Supports either:
   * - payload.points
   * - payload.results
   *
   * @param payload Category breakdown API response.
   * @returns Normalized category breakdown points.
   */
  export function getCategoryPoints(
    payload?: ExpenseByCategoryResponse | null,
  ): ExpenseByCategoryPoint[] {
    // # Step 1: Return backend `points` when available.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when available.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Extracts building breakdown points from the reporting payload.
   *
   * Supports either:
   * - payload.points
   * - payload.results
   *
   * @param payload Building breakdown API response.
   * @returns Normalized building breakdown points.
   */
  export function getBuildingPoints(
    payload?: ExpenseByBuildingResponse | null,
  ): ExpenseByBuildingPoint[] {
    // # Step 1: Return backend `points` when available.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when available.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Determines whether a dashboard metric should be displayed as currency.
   *
   * This uses lightweight heuristics based on common finance-oriented naming.
   *
   * @param metric Dashboard metric candidate.
   * @returns True when the metric should be formatted as money.
   */
  export function isMoneyMetric(metric: ExpenseDashboardMetric): boolean {
    // # Step 1: Normalize the key and label for safe matching.
    const key = metric.key.toLowerCase();
    const label = metric.label.toLowerCase();
  
    // # Step 2: Apply simple heuristics for finance-like metrics.
    return (
      key.includes("total") ||
      key.includes("amount") ||
      key.includes("cost") ||
      label.includes("total") ||
      label.includes("amount") ||
      label.includes("cost") ||
      label.includes("month") ||
      label.includes("year")
    );
  }