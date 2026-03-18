// # Filename: src/features/expenses/components/ExpenseReportingSection/ExpenseReportingSection.tsx


import type {
    ExpenseByBuildingResponse,
    ExpenseByCategoryResponse,
    ExpenseDashboardResponse,
    ExpenseMonthlyTrendResponse,
  } from "../../api/expensesTypes";
  import ReportingBuildingTable from "./ReportingBuildingTable";
  import ReportingCategoryTable from "./ReportingCategoryTable";
  import ReportingMetricsGrid from "./ReportingMetricsGrid";
  import ReportingTrendTable from "./ReportingTrendTable";
  import {
    getBuildingPoints,
    getCategoryPoints,
    getDashboardMetrics,
    getMonthlyTrendPoints,
  } from "./reportingSelectors";
  
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
   * ExpenseReportingSection
   *
   * Thin orchestration wrapper for the Expenses reporting surface.
   *
   * Responsibilities:
   * - handle loading, error, and empty states
   * - normalize reporting payloads into UI-friendly arrays
   * - compose reporting subcomponents
   *
   * Non-responsibilities:
   * - fetching data
   * - formatting numbers/currency
   * - rendering detailed table/card markup inline
   *
   * @param props Component props.
   * @returns Reporting section UI for the Expenses feature.
   */
  export default function ExpenseReportingSection({
    dashboard,
    monthlyTrend,
    byCategory,
    byBuilding,
    isLoading = false,
    errorMessage = null,
  }: ExpenseReportingSectionProps) {
    // # Step 1: Normalize incoming reporting payloads.
    const dashboardMetrics = getDashboardMetrics(dashboard);
    const monthlyTrendPoints = getMonthlyTrendPoints(monthlyTrend);
    const categoryPoints = getCategoryPoints(byCategory);
    const buildingPoints = getBuildingPoints(byBuilding);
  
    // # Step 2: Determine whether the reporting section is effectively empty.
    const isEmpty =
      dashboardMetrics.length === 0 &&
      monthlyTrendPoints.length === 0 &&
      categoryPoints.length === 0 &&
      buildingPoints.length === 0;
  
    // # Step 3: Render the loading state when reporting queries are still resolving.
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
  
    // # Step 4: Render the error state when reporting failed.
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
  
    // # Step 5: Render the empty state when the reporting payload has no usable data.
    if (isEmpty) {
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
  
    // # Step 6: Render the composed reporting surface.
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
  
          <ReportingMetricsGrid metrics={dashboardMetrics} />
        </div>
  
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ReportingTrendTable points={monthlyTrendPoints} />
          <ReportingCategoryTable points={categoryPoints} />
        </div>
  
        <ReportingBuildingTable points={buildingPoints} />
      </section>
    );
  }