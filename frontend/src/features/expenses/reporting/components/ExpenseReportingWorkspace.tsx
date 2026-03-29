
import { useEffect, useState } from "react";

import type {
  ExpenseBuildingOption,
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseByUnitResponse,
  ExpenseCategoryOption,
  ExpenseDashboardResponse,
  ExpenseMonthlyTrendResponse,
  ExpenseScope,
  ExpenseUnitOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import ExpenseReportingFiltersBar from "./ExpenseReportingFiltersBar";
import ExpenseReportingSection from "./ExpenseReportingSection";
import ExpensesWorkspaceTabs, {
  type ExpensesWorkspaceTab,
} from "../../components/ExpensesWorkspaceTabs";

interface ExpenseReportingWorkspaceProps {
  workspaceTab: ExpensesWorkspaceTab;
  onWorkspaceTabChange: (nextValue: ExpensesWorkspaceTab) => void;
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
  byUnit?: ExpenseByUnitResponse | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onScopeChange: (value: ExpenseScope | null) => void;
  onCategoryChange: (value: number | null) => void;
  onVendorChange: (value: number | null) => void;
  onBuildingChange: (value: number | null) => void;
  onUnitChange: (value: number | null) => void;
}

export type ComparisonMode = "category" | "building" | "unit";

const WORKSPACE_CLASS = "flex flex-col";

const SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const HEADER_CLASS =
  "flex flex-col gap-4 border-b border-neutral-800 px-5 py-5 sm:px-6";

const HEADER_TOP_ROW_CLASS =
  "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between";

const HEADER_TEXT_CLASS = "flex min-w-0 flex-col gap-1";

const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

const TITLE_CLASS = "text-2xl font-semibold tracking-tight text-white";

const DESCRIPTION_CLASS = "max-w-3xl text-sm leading-6 text-neutral-400";

export default function ExpenseReportingWorkspace({
  workspaceTab,
  onWorkspaceTabChange,
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
  byUnit,
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

  // # Step 2: Unit comparison remains available only when a building is selected.
  const canCompareUnits = selectedBuildingId !== null;

  // # Step 3: Auto-fallback when the current mode becomes invalid.
  useEffect(() => {
    if (comparisonMode === "unit" && !canCompareUnits) {
      setComparisonMode("category");
    }
  }, [comparisonMode, canCompareUnits]);

  return (
    <section className={WORKSPACE_CLASS} aria-label="Expense reporting workspace">
      <section className={SHELL_CLASS}>
        <div className={HEADER_CLASS}>
          <div className={HEADER_TOP_ROW_CLASS}>
            <div className={HEADER_TEXT_CLASS}>
              <p className={EYEBROW_CLASS}>Reporting workspace</p>

              <h2 className={TITLE_CLASS}>Expense reporting</h2>

              <p className={DESCRIPTION_CLASS}>
                Review deterministic spend patterns with one main trend view and
                a focused comparison section.
              </p>
            </div>

            <ExpensesWorkspaceTabs
              value={workspaceTab}
              onChange={onWorkspaceTabChange}
            />
          </div>

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
        </div>

        <div className="p-5 sm:p-6">
          <ExpenseReportingSection
            dashboard={dashboard}
            monthlyTrend={monthlyTrend}
            byCategory={byCategory}
            byBuilding={byBuilding}
            byUnit={byUnit}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            comparisonMode={comparisonMode}
            canCompareUnits={canCompareUnits}
            onComparisonModeChange={setComparisonMode}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>
      </section>
    </section>
  );
}