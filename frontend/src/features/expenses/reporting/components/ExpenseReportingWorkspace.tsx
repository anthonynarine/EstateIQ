// # Filename: src/features/expenses/reporting/components/ExpenseReportingWorkspace.tsx

// ✅ New Code

import { useMemo, useState } from "react";

import type {
  ExpenseBuildingOption,
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseCategoryOption,
  ExpenseDashboardResponse,
  ExpenseMonthlyTrendResponse,
  ExpenseScope,
  ExpenseUnitOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import ExpenseReportingFiltersBar from "./ExpenseReportingFiltersBar";
import ExpenseReportingSection from "./ExpenseReportingSection";

/**
 * Props for the ExpenseReportingWorkspace component.
 */
interface ExpenseReportingWorkspaceProps {
  selectedScope: ExpenseScope | null;
  selectedCategoryId: number | null;
  selectedVendorId: number | null;
  selectedBuildingId: number | null;
  selectedUnitId: number | null;
  categories?: ExpenseCategoryOption[];
  vendors?: ExpenseVendorOption[];
  buildingOptions?: ExpenseBuildingOption[];
  unitOptions?: ExpenseUnitOption[];
  isPropertyLookupLoading?: boolean;
  propertyLookupErrorMessage?: string | null;
  dashboard?: ExpenseDashboardResponse | null;
  monthlyTrend?: ExpenseMonthlyTrendResponse | null;
  byCategory?: ExpenseByCategoryResponse | null;
  byBuilding?: ExpenseByBuildingResponse | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onScopeChange: (value: ExpenseScope | null) => void;
  onCategoryChange: (value: number | null) => void;
  onVendorChange: (value: number | null) => void;
  onBuildingChange: (value: number | null) => void;
  onUnitChange: (value: number | null) => void;
}

type ComparisonMode = "category" | "building";

const WORKSPACE_CLASS = "flex flex-col gap-6";

const SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const HEADER_CLASS =
  "flex flex-col gap-4 border-b border-neutral-800 px-5 py-5 sm:px-6";

const HEADER_ROW_CLASS =
  "flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between";

const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

const TITLE_CLASS = "text-2xl font-semibold tracking-tight text-white";

const DESCRIPTION_CLASS = "max-w-3xl text-sm leading-6 text-neutral-400";

const BADGE_CLASS =
  "inline-flex items-center self-start rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300";

const CONTROLS_ROW_CLASS =
  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

const TOGGLE_GROUP_CLASS =
  "inline-flex items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-950 p-1";

const TOGGLE_BUTTON_BASE_CLASS =
  "rounded-xl px-3 py-2 text-sm font-medium transition";

const TOGGLE_BUTTON_ACTIVE_CLASS =
  "bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]";

const TOGGLE_BUTTON_INACTIVE_CLASS =
  "text-neutral-400 hover:bg-neutral-900 hover:text-white";

/**
 * ExpenseReportingWorkspace
 *
 * Public orchestration boundary for expense reporting.
 *
 * @param props Component props.
 * @returns Expense reporting workspace UI.
 */
export default function ExpenseReportingWorkspace({
  selectedScope,
  selectedCategoryId,
  selectedVendorId,
  selectedBuildingId,
  selectedUnitId,
  categories = [],
  vendors = [],
  buildingOptions = [],
  unitOptions = [],
  isPropertyLookupLoading = false,
  propertyLookupErrorMessage = null,
  dashboard,
  monthlyTrend,
  byCategory,
  byBuilding,
  isLoading = false,
  errorMessage = null,
  onScopeChange,
  onCategoryChange,
  onVendorChange,
  onBuildingChange,
  onUnitChange,
}: ExpenseReportingWorkspaceProps) {
  // # Step 1: Keep comparison mode at the workspace level only.
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("category");

  // # Step 2: Resolve a compact label for the active comparison state.
  const comparisonLabel = useMemo(() => {
    return comparisonMode === "category"
      ? "Category comparison"
      : "Building comparison";
  }, [comparisonMode]);

  return (
    <section className={WORKSPACE_CLASS} aria-label="Expense reporting workspace">
      <ExpenseReportingFiltersBar
        selectedScope={selectedScope}
        selectedCategoryId={selectedCategoryId}
        selectedVendorId={selectedVendorId}
        selectedBuildingId={selectedBuildingId}
        selectedUnitId={selectedUnitId}
        categories={categories}
        vendors={vendors}
        buildingOptions={buildingOptions}
        unitOptions={unitOptions}
        isPropertyLookupLoading={isPropertyLookupLoading}
        propertyLookupErrorMessage={propertyLookupErrorMessage}
        onScopeChange={onScopeChange}
        onCategoryChange={onCategoryChange}
        onVendorChange={onVendorChange}
        onBuildingChange={onBuildingChange}
        onUnitChange={onUnitChange}
      />

      <section className={SHELL_CLASS}>
        <div className={HEADER_CLASS}>
          <div className={HEADER_ROW_CLASS}>
            <div className="flex min-w-0 flex-col gap-1">
              <p className={EYEBROW_CLASS}>Reporting workspace</p>
              <h2 className={TITLE_CLASS}>Expense reporting</h2>
              <p className={DESCRIPTION_CLASS}>
                Review deterministic spend patterns with one main trend view and
                a focused comparison mode.
              </p>
            </div>

            <div className={BADGE_CLASS}>Chart-first reporting</div>
          </div>

          <div className={CONTROLS_ROW_CLASS}>
            <div className={TOGGLE_GROUP_CLASS}>
              <button
                type="button"
                onClick={() => setComparisonMode("category")}
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
                onClick={() => setComparisonMode("building")}
                className={`${TOGGLE_BUTTON_BASE_CLASS} ${
                  comparisonMode === "building"
                    ? TOGGLE_BUTTON_ACTIVE_CLASS
                    : TOGGLE_BUTTON_INACTIVE_CLASS
                }`}
                aria-pressed={comparisonMode === "building"}
              >
                By building
              </button>
            </div>

            <div className="text-xs text-neutral-500">
              Active view:{" "}
              <span className="font-medium text-neutral-300">
                {comparisonLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <ExpenseReportingSection
            dashboard={dashboard}
            monthlyTrend={monthlyTrend}
            byCategory={byCategory}
            byBuilding={byBuilding}
            comparisonMode={comparisonMode}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>
      </section>
    </section>
  );
}