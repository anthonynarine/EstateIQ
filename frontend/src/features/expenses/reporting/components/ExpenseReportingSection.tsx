// # Filename: src/features/expenses/reporting/components/ExpenseReportingSection.tsx

// ✅ New Code

import type {
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseDashboardResponse,
  ExpenseMonthlyTrendResponse,
} from "../../api/expensesTypes";
import ReportingBuildingTable from "./ReportingBuildingTable";
import ReportingCategoryTable from "./ReportingCategoryTable";
import ReportingKpiStrip from "./ReportingKpiStrip";
import ReportingTrendTable from "./ReportingTrendTable";
import {
  getBuildingPoints,
  getCategoryPoints,
  getDashboardMetrics,
  getMonthlyTrendPoints,
} from "../utils/reportingSelectors";

/**
 * Props for the ExpenseReportingSection component.
 */
interface ExpenseReportingSectionProps {
  dashboard?: ExpenseDashboardResponse | null;
  monthlyTrend?: ExpenseMonthlyTrendResponse | null;
  byCategory?: ExpenseByCategoryResponse | null;
  byBuilding?: ExpenseByBuildingResponse | null;
  comparisonMode: "category" | "building";
  isLoading?: boolean;
  errorMessage?: string | null;
}

interface ReportingStateCardProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "error";
}

/**
 * Shared reporting state card.
 *
 * @param props Component props.
 * @returns A consistent reporting state surface.
 */
function ReportingStateCard({
  eyebrow,
  title,
  description,
  tone = "default",
}: ReportingStateCardProps) {
  // # Step 1: Resolve visual tone classes.
  const panelClass =
    tone === "error"
      ? "border-red-500/25 bg-red-500/10"
      : "border-neutral-800 bg-neutral-900/60";

  const titleClass = tone === "error" ? "text-red-100" : "text-white";
  const descriptionClass =
    tone === "error" ? "text-red-200/90" : "text-neutral-400";

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="p-4 sm:p-5">
        <div className={`rounded-2xl border px-4 py-4 sm:px-5 ${panelClass}`}>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {eyebrow}
            </p>

            <h3 className={`text-xl font-semibold tracking-tight ${titleClass}`}>
              {title}
            </h3>

            <p className={`text-sm ${descriptionClass}`}>{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ExpenseReportingSection
 *
 * Presentational reporting body.
 *
 * @param props Component props.
 * @returns Reporting content area.
 */
export default function ExpenseReportingSection({
  dashboard,
  monthlyTrend,
  byCategory,
  byBuilding,
  comparisonMode,
  isLoading = false,
  errorMessage = null,
}: ExpenseReportingSectionProps) {
  // # Step 1: Normalize reporting payloads into UI-safe shapes.
  const dashboardMetrics = getDashboardMetrics(dashboard);
  const monthlyTrendPoints = getMonthlyTrendPoints(monthlyTrend);
  const categoryPoints = getCategoryPoints(byCategory);
  const buildingPoints = getBuildingPoints(byBuilding);

  // # Step 2: Resolve data presence.
  const hasDashboardMetrics = dashboardMetrics.length > 0;
  const hasMonthlyTrend = monthlyTrendPoints.length > 0;
  const hasCategoryBreakdown = categoryPoints.length > 0;
  const hasBuildingBreakdown = buildingPoints.length > 0;

  const isEmpty =
    !hasDashboardMetrics &&
    !hasMonthlyTrend &&
    !hasCategoryBreakdown &&
    !hasBuildingBreakdown;

  // # Step 3: Resolve loading state.
  if (isLoading) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="Loading expense reporting data for the current filtered view..."
      />
    );
  }

  // # Step 4: Resolve error state.
  if (errorMessage) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting unavailable"
        description={errorMessage}
        tone="error"
      />
    );
  }

  // # Step 5: Resolve empty state.
  if (isEmpty) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="No reporting data is available for the current filters yet. Add expenses or widen the current filter set to populate this workspace."
      />
    );
  }

// # Step 2: Temporary debugging logs.
console.log("dashboard raw", dashboard);
console.log("monthlyTrend raw", monthlyTrend);
console.log("byCategory raw", byCategory);
console.log("byBuilding raw", byBuilding);

console.log("dashboardMetrics", dashboardMetrics);
console.log("monthlyTrendPoints", monthlyTrendPoints);
console.log("categoryPoints", categoryPoints);
console.log("buildingPoints", buildingPoints);

  return (
    <section className="flex flex-col gap-5">
      {hasDashboardMetrics ? (
        <ReportingKpiStrip metrics={dashboardMetrics} />
      ) : null}

      {hasMonthlyTrend ? (
        <ReportingTrendTable points={monthlyTrendPoints} />
      ) : null}

      {comparisonMode === "category" ? (
        hasCategoryBreakdown ? (
          <ReportingCategoryTable points={categoryPoints} />
        ) : (
          <ReportingStateCard
            eyebrow="Comparison workspace"
            title="No category comparison data"
            description="There is no category breakdown available for the current filters."
          />
        )
      ) : hasBuildingBreakdown ? (
        <ReportingBuildingTable points={buildingPoints} />
      ) : (
        <ReportingStateCard
          eyebrow="Comparison workspace"
          title="No building comparison data"
          description="There is no building breakdown available for the current filters."
        />
      )}
    </section>
  );
}