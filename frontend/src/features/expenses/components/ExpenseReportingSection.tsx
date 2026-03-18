// # Filename: src/features/expenses/components/ExpenseReportingSection.tsx

// ✅ New Code

import type {
    ExpenseByBuildingPoint,
    ExpenseByBuildingResponse,
    ExpenseByCategoryPoint,
    ExpenseByCategoryResponse,
    ExpenseDashboardMetric,
    ExpenseDashboardResponse,
    ExpenseMonthlyTrendPoint,
    ExpenseMonthlyTrendResponse,
  } from "../api/expensesTypes";
  
  /**
   * Props for the ExpenseReportingSection component.
   */
  interface ExpenseReportingSectionProps {
    dashboard?: ExpenseDashboardResponse | null;
    monthlyTrend?: ExpenseMonthlyTrendResponse | null;
    byCategory?: ExpenseByCategoryResponse | null;
    byBuilding?: ExpenseByBuildingResponse | null;
    isLoading?: boolean;
    errorMessage?: string | null;
  }
  
  /**
   * Safely formats currency-like values for display.
   *
   * @param value Money-like API value.
   * @returns User-friendly USD currency string.
   */
  function formatCurrency(value: string | number | null | undefined): string {
    // # Step 1: Normalize missing values.
    if (value === null || value === undefined || value === "") {
      return "$0.00";
    }
  
    // # Step 2: Convert string or number into a numeric value.
    const numericValue =
      typeof value === "number" ? value : Number.parseFloat(value);
  
    // # Step 3: Guard against malformed values.
    if (Number.isNaN(numericValue)) {
      return "$0.00";
    }
  
    // # Step 4: Return a localized currency string.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numericValue);
  }
  
  /**
   * Safely formats numeric-like values for display.
   *
   * @param value Numeric-like API value.
   * @returns Readable number string.
   */
  function formatNumber(value: string | number | null | undefined): string {
    // # Step 1: Normalize missing values.
    if (value === null || value === undefined || value === "") {
      return "0";
    }
  
    // # Step 2: Convert to a number.
    const numericValue =
      typeof value === "number" ? value : Number.parseFloat(value);
  
    // # Step 3: Guard against malformed values.
    if (Number.isNaN(numericValue)) {
      return "0";
    }
  
    // # Step 4: Return a localized number string.
    return new Intl.NumberFormat("en-US").format(numericValue);
  }
  
  /**
   * Attempts to extract dashboard metrics in a UI-friendly card format.
   *
   * Strategy:
   * - prefer backend-provided `metrics`
   * - otherwise synthesize from known dashboard fields
   *
   * @param dashboard Dashboard payload from the reporting API.
   * @returns Dashboard card metrics for display.
   */
  function getDashboardMetrics(
    dashboard?: ExpenseDashboardResponse | null,
  ): ExpenseDashboardMetric[] {
    // # Step 1: Return an empty list if there is no dashboard payload.
    if (!dashboard) {
      return [];
    }
  
    // # Step 2: Prefer backend-provided metrics when available.
    if (Array.isArray(dashboard.metrics) && dashboard.metrics.length > 0) {
      return dashboard.metrics;
    }
  
    // # Step 3: Build a safe fallback metric set from known dashboard fields.
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
   * @param payload Monthly trend API response.
   * @returns Array of monthly trend points.
   */
  function getMonthlyTrendPoints(
    payload?: ExpenseMonthlyTrendResponse | null,
  ): ExpenseMonthlyTrendPoint[] {
    // # Step 1: Return backend `points` when present.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when present.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Extracts category breakdown points from the reporting payload.
   *
   * @param payload Category breakdown API response.
   * @returns Array of category breakdown points.
   */
  function getCategoryPoints(
    payload?: ExpenseByCategoryResponse | null,
  ): ExpenseByCategoryPoint[] {
    // # Step 1: Return backend `points` when present.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when present.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Extracts building breakdown points from the reporting payload.
   *
   * @param payload Building breakdown API response.
   * @returns Array of building breakdown points.
   */
  function getBuildingPoints(
    payload?: ExpenseByBuildingResponse | null,
  ): ExpenseByBuildingPoint[] {
    // # Step 1: Return backend `points` when present.
    if (payload?.points && Array.isArray(payload.points)) {
      return payload.points;
    }
  
    // # Step 2: Fall back to `results` when present.
    if (payload?.results && Array.isArray(payload.results)) {
      return payload.results;
    }
  
    return [];
  }
  
  /**
   * Determines whether a metric likely represents money.
   *
   * @param metric Dashboard metric candidate.
   * @returns True when the metric should be formatted as currency.
   */
  function isMoneyMetric(metric: ExpenseDashboardMetric): boolean {
    // # Step 1: Normalize metric key and label for safe matching.
    const key = metric.key.toLowerCase();
    const label = metric.label.toLowerCase();
  
    // # Step 2: Use lightweight heuristics based on common finance wording.
    return (
      key.includes("total") ||
      key.includes("amount") ||
      label.includes("total") ||
      label.includes("amount") ||
      label.includes("month") ||
      label.includes("year")
    );
  }
  
  /**
   * ExpenseReportingSection
   *
   * Presentational reporting surface for the Expenses feature.
   *
   * Responsibilities:
   * - render dashboard summary cards
   * - render monthly trend data
   * - render category and building breakdowns
   * - show reporting loading/error/empty states
   *
   * Non-responsibilities:
   * - fetching data
   * - building filters
   * - mutation orchestration
   * - route state
   *
   * This first-pass implementation intentionally favors trustworthy tables
   * and metrics over chart-heavy UI. Once the vertical slice is working
   * end-to-end, we can upgrade this to richer chart visuals safely.
   *
   * @param props Component props.
   * @returns Reporting UI section for expenses.
   */
  export default function ExpenseReportingSection({
    dashboard,
    monthlyTrend,
    byCategory,
    byBuilding,
    isLoading = false,
    errorMessage = null,
  }: ExpenseReportingSectionProps) {
    const dashboardMetrics = getDashboardMetrics(dashboard);
    const monthlyTrendPoints = getMonthlyTrendPoints(monthlyTrend);
    const categoryPoints = getCategoryPoints(byCategory);
    const buildingPoints = getBuildingPoints(byBuilding);
  
    // # Step 1: Handle loading state.
    if (isLoading) {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Expense Reporting
            </h2>
            <p className="text-sm text-slate-600">
              Loading expense reporting data...
            </p>
          </div>
        </section>
      );
    }
  
    // # Step 2: Handle reporting error state.
    if (errorMessage) {
      return (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-red-900">
              Expense Reporting
            </h2>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </section>
      );
    }
  
    // # Step 3: Handle empty reporting state.
    if (
      dashboardMetrics.length === 0 &&
      monthlyTrendPoints.length === 0 &&
      categoryPoints.length === 0 &&
      buildingPoints.length === 0
    ) {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Expense Reporting
            </h2>
            <p className="text-sm text-slate-600">
              No reporting data is available for the current view.
            </p>
          </div>
        </section>
      );
    }
  
    // # Step 4: Render reporting content.
    return (
      <section className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Expense Reporting
            </h2>
            <p className="text-sm text-slate-600">
              Reporting reflects the current expense view and helps surface
              portfolio-level spending patterns.
            </p>
          </div>
  
          {dashboardMetrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardMetrics.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium text-slate-600">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {isMoneyMetric(metric)
                      ? formatCurrency(metric.value)
                      : formatNumber(metric.value)}
                  </p>
                  {metric.change !== undefined && metric.change !== null ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Change: {formatNumber(metric.change)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Dashboard summary metrics are not available.
            </p>
          )}
        </div>
  
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Monthly Trend
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Expense totals by month for the current reporting range.
              </p>
            </div>
  
            <div className="overflow-x-auto">
              {monthlyTrendPoints.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Month
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {monthlyTrendPoints.map((point, index) => (
                      <tr key={`${point.month}-${index}`} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {point.month}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(point.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-4 text-sm text-slate-500">
                  No monthly trend data is available.
                </div>
              )}
            </div>
          </div>
  
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                By Category
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Expense distribution grouped by category.
              </p>
            </div>
  
            <div className="overflow-x-auto">
              {categoryPoints.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Count
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {categoryPoints.map((point, index) => (
                      <tr
                        key={`${point.category_id ?? point.category_name ?? "category"}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {point.category_name ?? "Uncategorized"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-700">
                          {formatNumber(point.count)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(point.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-4 text-sm text-slate-500">
                  No category breakdown data is available.
                </div>
              )}
            </div>
          </div>
        </div>
  
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              By Building
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Compare expense totals across buildings in the current scope.
            </p>
          </div>
  
          <div className="overflow-x-auto">
            {buildingPoints.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Building
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {buildingPoints.map((point, index) => (
                    <tr
                      key={`${point.building_id ?? point.building_name ?? "building"}-${index}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {point.building_name ?? "Unassigned"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-700">
                        {formatNumber(point.count)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(point.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-4 text-sm text-slate-500">
                No building breakdown data is available.
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }