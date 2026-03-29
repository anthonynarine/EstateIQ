import type {
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseByUnitResponse,
  ExpenseDashboardResponse,
  ExpenseMonthlyTrendResponse,
} from "../../api/expensesTypes";
import ReportingBuildingTable from "./ReportingBuildingTable";
import ReportingCategoryTable from "./ReportingCategoryTable";
import ReportingTrendTable from "./ReportingTrendTable";
import ReportingUnitTable from "./ReportingUnitTable";
import type { ComparisonMode } from "./ExpenseReportingWorkspace";
import {
  getBuildingPoints,
  getCategoryPoints,
  getMonthlyTrendPoints,
  getUnitPoints,
} from "../utils/reportingSelectors";

/**
 * Props for the ExpenseReportingSection component.
 */
interface ExpenseReportingSectionProps {
  dashboard?: ExpenseDashboardResponse | null;
  monthlyTrend?: ExpenseMonthlyTrendResponse | null;
  byCategory?: ExpenseByCategoryResponse | null;
  byBuilding?: ExpenseByBuildingResponse | null;
  byUnit?: ExpenseByUnitResponse | null;
  selectedBuildingId?: number | null;
  selectedUnitId?: number | null;
  comparisonMode: ComparisonMode;
  canCompareUnits: boolean;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

interface ReportingStateCardProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "error";
}

const COMPARISON_HEADER_CLASS =
  "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between";

const COMPARISON_TOGGLE_GROUP_CLASS =
  "inline-flex w-full max-w-fit items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-950 p-1";

const TOGGLE_BUTTON_BASE_CLASS =
  "rounded-xl px-3 py-2 text-sm font-medium transition";

const TOGGLE_BUTTON_ACTIVE_CLASS =
  "bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]";

const TOGGLE_BUTTON_INACTIVE_CLASS =
  "text-neutral-400 hover:bg-neutral-900 hover:text-white";

const TOGGLE_BUTTON_DISABLED_CLASS =
  "cursor-not-allowed text-neutral-600 opacity-60";

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
 * Comparison mode toggle group rendered near the comparison surface.
 *
 * @param props Component props.
 * @returns Comparison mode controls.
 */
function ComparisonModeToggle({
  comparisonMode,
  canCompareUnits,
  onChange,
}: {
  comparisonMode: ComparisonMode;
  canCompareUnits: boolean;
  onChange: (mode: ComparisonMode) => void;
}) {
  return (
    <div className={COMPARISON_TOGGLE_GROUP_CLASS}>
      <button
        type="button"
        onClick={() => onChange("category")}
        className={`${TOGGLE_BUTTON_BASE_CLASS} ${
          comparisonMode === "category"
            ? TOGGLE_BUTTON_ACTIVE_CLASS
            : TOGGLE_BUTTON_INACTIVE_CLASS
        }`}
        aria-pressed={comparisonMode === "category"}
      >
        By category
      </button>

      <button
        type="button"
        onClick={() => onChange("building")}
        className={`${TOGGLE_BUTTON_BASE_CLASS} ${
          comparisonMode === "building"
            ? TOGGLE_BUTTON_ACTIVE_CLASS
            : TOGGLE_BUTTON_INACTIVE_CLASS
        }`}
        aria-pressed={comparisonMode === "building"}
      >
        By building
      </button>

      <button
        type="button"
        onClick={() => {
          if (canCompareUnits) {
            onChange("unit");
          }
        }}
        disabled={!canCompareUnits}
        className={`${TOGGLE_BUTTON_BASE_CLASS} ${
          comparisonMode === "unit"
            ? TOGGLE_BUTTON_ACTIVE_CLASS
            : canCompareUnits
              ? TOGGLE_BUTTON_INACTIVE_CLASS
              : TOGGLE_BUTTON_DISABLED_CLASS
        }`}
        aria-pressed={comparisonMode === "unit"}
        aria-disabled={!canCompareUnits}
        title={
          canCompareUnits
            ? "Compare units"
            : "Select a building to compare units"
        }
      >
        By unit
      </button>
    </div>
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
  byUnit,
  selectedBuildingId = null,
  selectedUnitId = null,
  comparisonMode,
  canCompareUnits,
  onComparisonModeChange,
  isLoading = false,
  errorMessage = null,
}: ExpenseReportingSectionProps) {
  // # Step 1: Dashboard is intentionally unused here for now.
  void dashboard;

  // # Step 2: Normalize reporting payloads into UI-safe shapes.
  const monthlyTrendPoints = getMonthlyTrendPoints(monthlyTrend);
  const categoryPoints = getCategoryPoints(byCategory);
  const buildingPoints = getBuildingPoints(byBuilding);
  const unitPoints = getUnitPoints(byUnit);

  // # Step 3: Resolve data presence.
  const hasMonthlyTrend = monthlyTrendPoints.length > 0;
  const hasCategoryBreakdown = categoryPoints.length > 0;
  const hasBuildingBreakdown = buildingPoints.length > 0;
  const hasUnitBreakdown = unitPoints.length > 0;

  const isEmpty =
    !hasMonthlyTrend &&
    !hasCategoryBreakdown &&
    !hasBuildingBreakdown &&
    !hasUnitBreakdown;

  // # Step 4: Resolve loading state.
  if (isLoading) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="Loading expense reporting data for the current filtered view..."
      />
    );
  }

  // # Step 5: Resolve error state.
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

  // # Step 6: Resolve empty state.
  if (isEmpty) {
    return (
      <ReportingStateCard
        eyebrow="Reporting workspace"
        title="Expense reporting"
        description="No reporting data is available for the current filters yet. Add expenses or widen the current filter set to populate this workspace."
      />
    );
  }

  // # Step 7: Render the reporting workspace.
  return (
    <section className="flex flex-col gap-5">
      {hasMonthlyTrend ? (
        <ReportingTrendTable points={monthlyTrendPoints} />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className={COMPARISON_HEADER_CLASS}>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Comparison workspace
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Compare distribution
            </h3>

            <p className="text-sm text-neutral-400">
              Switch the lower comparison view without affecting the monthly
              trend above.
            </p>
          </div>

          <ComparisonModeToggle
            comparisonMode={comparisonMode}
            canCompareUnits={canCompareUnits}
            onChange={onComparisonModeChange}
          />
        </div>

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
        ) : comparisonMode === "building" ? (
          hasBuildingBreakdown ? (
            <ReportingBuildingTable points={buildingPoints} />
          ) : (
            <ReportingStateCard
              eyebrow="Comparison workspace"
              title="No building comparison data"
              description="There is no building breakdown available for the current filters."
            />
          )
        ) : !selectedBuildingId ? (
          <ReportingStateCard
            eyebrow="Comparison workspace"
            title="Select a building to compare units"
            description="Unit comparison is available only within a selected building context. Choose a building in the reporting filters to view unit-level spend distribution."
          />
        ) : hasUnitBreakdown ? (
          <ReportingUnitTable
            points={unitPoints}
            selectedUnitId={selectedUnitId}
          />
        ) : (
          <ReportingStateCard
            eyebrow="Comparison workspace"
            title="No unit comparison data"
            description="There is no unit breakdown available for the current filters in the selected building."
          />
        )}
      </section>
    </section>
  );
}