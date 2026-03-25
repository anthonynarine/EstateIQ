// # Filename: src/features/expenses/components/ExpenseReportingSection/ExpenseReportingSection.tsx
// ✅ New Code

import type { ReactNode } from "react";

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

interface ReportingStateCardProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "error";
}

interface ReportingSectionShellProps {
  children: ReactNode;
}

/**
 * Shared shell used by reporting sections so the reporting workspace
 * visually matches the rest of the EstateIQ Expenses experience.
 *
 * @param props Component props.
 * @returns A dark reporting shell container.
 */
function ReportingSectionShell({ children }: ReportingSectionShellProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      {children}
    </section>
  );
}

/**
 * Shared state card for loading, error, and empty states.
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
  const titleClass =
    tone === "error" ? "text-red-100" : "text-white";
  const descriptionClass =
    tone === "error" ? "text-red-200/90" : "text-neutral-400";
  const panelClass =
    tone === "error"
      ? "border-red-500/25 bg-red-500/10"
      : "border-neutral-800 bg-neutral-900/60";

  return (
    <ReportingSectionShell>
      <div className="p-4 sm:p-5">
        <div className={`rounded-2xl border px-4 py-4 sm:px-5 ${panelClass}`}>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {eyebrow}
            </p>

            <h2 className={`text-xl font-semibold tracking-tight ${titleClass}`}>
              {title}
            </h2>

            <p className={`text-sm ${descriptionClass}`}>{description}</p>
          </div>
        </div>
      </div>
    </ReportingSectionShell>
  );
}

/**
 * Small status pill used in the reporting overview header.
 *
 * @param props Component props.
 * @returns Compact reporting status badge.
 */
function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
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
 * - provide a reporting-first layout shell for charts and tables
 *
 * Non-responsibilities:
 * - fetching data
 * - formatting numbers/currency
 * - rendering chart internals
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

  // # Step 2: Determine whether each reporting slice has data.
  const hasDashboardMetrics = dashboardMetrics.length > 0;
  const hasMonthlyTrend = monthlyTrendPoints.length > 0;
  const hasCategoryBreakdown = categoryPoints.length > 0;
  const hasBuildingBreakdown = buildingPoints.length > 0;

  // # Step 3: Determine whether the reporting section is effectively empty.
  const isEmpty =
    !hasDashboardMetrics &&
    !hasMonthlyTrend &&
    !hasCategoryBreakdown &&
    !hasBuildingBreakdown;

  // # Step 4: Render the loading state when reporting queries are still resolving.
  if (isLoading) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="Loading expense reporting data for the current expense view..."
      />
    );
  }

  // # Step 5: Render the error state when reporting failed.
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

  // # Step 6: Render the empty state when the reporting payload has no usable data.
  if (isEmpty) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="No reporting data is available for the current filters yet. Add expenses or widen the current filter set to populate this workspace."
      />
    );
  }

  // # Step 7: Render the composed reporting surface.
  return (
    <section className="flex flex-col gap-5">
      <ReportingSectionShell>
        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Reporting workspace   live test
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Expense reporting
              </h2>

              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Review deterministic expense totals, category distribution,
                and building-level cost comparisons for the current record view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>
                {hasDashboardMetrics ? "Summary ready" : "Summary pending"}
              </StatusPill>

              <StatusPill>
                {hasMonthlyTrend ? "Trend available" : "Trend unavailable"}
              </StatusPill>

              <StatusPill>
                {hasCategoryBreakdown
                  ? "Category breakdown ready"
                  : "Category breakdown unavailable"}
              </StatusPill>

              <StatusPill>
                {hasBuildingBreakdown
                  ? "Building comparison ready"
                  : "Building comparison unavailable"}
              </StatusPill>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
            <ReportingMetricsGrid metrics={dashboardMetrics} />
          </div>
        </div>
      </ReportingSectionShell>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <ReportingSectionShell>
          <ReportingTrendTable points={monthlyTrendPoints} />
        </ReportingSectionShell>

        <ReportingSectionShell>
          <ReportingCategoryTable points={categoryPoints} />
        </ReportingSectionShell>
      </div>

      <ReportingSectionShell>
        <ReportingBuildingTable points={buildingPoints} />
      </ReportingSectionShell>
    </section>
  );
}