// # Filename: src/features/expenses/pages/hooks/useExpensesPageData.ts



import { useMemo } from "react";

import type { ExpenseFormValues } from "../../components/expense-form/expenseFormTypes";
import {
  useExpenseByBuilding,
  useExpenseByCategory,
  useExpenseCategories,
  useExpenseDashboard,
  useExpenseDetail,
  useExpenseList,
  useExpenseMonthlyTrend,
  useExpenseVendors,
} from "../../hooks/useExpenseQueries";
import type {
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseCategoryOption,
  ExpenseDashboardResponse,
  ExpenseListFilters,
  ExpenseListItem,
  ExpenseMonthlyTrendResponse,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import type { UseExpensesPageStateResult } from "./useExpensesPageState";
import { getExpensePageErrorMessage } from "../utils/expensePageErrors";
import { mapExpenseToFormValues } from "../utils/expensePageMappers";

/**
 * Derived data contract for the Expenses page orchestration layer.
 *
 * This hook does not own local UI state.
 * It derives view-ready data from:
 * - page state
 * - list queries
 * - lookup queries
 * - reporting queries
 * - optional selected expense detail query for edit mode
 */
export interface UseExpensesPageDataResult {
  listFilters: ExpenseListFilters;
  reportingFilters: ExpenseListFilters;
  expenses: ExpenseListItem[];
  totalExpenseCount: number;

  /**
   * Safe count hint for the reporting section.
   *
   * This is only populated when the current list query is aligned closely
   * enough with the reporting filters that the count can be used honestly
   * as a fallback signal for partial rendering.
   */
  reportingRecordCountHint: number | null;

  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];

  formMode: "create" | "edit";
  formInitialValues: Partial<ExpenseFormValues>;

  dashboard: ExpenseDashboardResponse | null;
  monthlyTrend: ExpenseMonthlyTrendResponse | null;
  byCategory: ExpenseByCategoryResponse | null;
  byBuilding: ExpenseByBuildingResponse | null;

  isListLoading: boolean;
  isExpenseDetailLoading: boolean;
  isReportingLoading: boolean;
  isLookupLoading: boolean;

  reportingErrorMessage: string | null;
  listErrorMessage: string | null;
  lookupErrorMessage: string | null;
  hasLookupError: boolean;

  expenseListQuery: ReturnType<typeof useExpenseList>;
  categoriesQuery: ReturnType<typeof useExpenseCategories>;
  vendorsQuery: ReturnType<typeof useExpenseVendors>;
  expenseDetailQuery: ReturnType<typeof useExpenseDetail>;
  dashboardQuery: ReturnType<typeof useExpenseDashboard>;
  monthlyTrendQuery: ReturnType<typeof useExpenseMonthlyTrend>;
  byCategoryQuery: ReturnType<typeof useExpenseByCategory>;
  byBuildingQuery: ReturnType<typeof useExpenseByBuilding>;
}

/**
 * Determines whether the current expense list count is safe to reuse as a
 * reporting fallback hint.
 *
 * Why this matters:
 * the list query may include extra constraints like free-text search or
 * archived-only mode that the reporting queries do not currently apply.
 * In those cases, reusing the list count inside reporting would be misleading.
 *
 * @param pageState Page-local state controlling list and reporting filters.
 * @returns True when the list query count is close enough to reporting scope
 *   to be reused honestly as a reporting fallback hint.
 */
function canUseListCountAsReportingHint(
  pageState: UseExpensesPageStateResult,
): boolean {
  // # Step 1: Free-text search changes the list scope but not reporting scope.
  if (pageState.searchInput.trim()) {
    return false;
  }

  // # Step 2: Archived-only mode also changes list scope but not reporting.
  if (pageState.showArchivedOnly) {
    return false;
  }

  // # Step 3: If neither mismatch exists, the count is safe to reuse.
  return true;
}

/**
 * Derives all query-backed data needed by the Expenses page.
 *
 * Responsibilities:
 * - translate page state into list/reporting filters
 * - fetch list, lookups, selected expense detail, and reporting data
 * - map the selected expense into edit-form initial values
 * - expose consolidated loading and error states for the page layer
 *
 * Design note:
 * This hook stays read-only.
 * It does not own mutations or table/form actions.
 *
 * @param pageState Page-local UI state from `useExpensesPageState`.
 * @returns Query-backed data prepared for the Expenses page.
 */
export function useExpensesPageData(
  pageState: UseExpensesPageStateResult,
): UseExpensesPageDataResult {
  const listFilters = useMemo<ExpenseListFilters>(() => {
    return {
      // # Step 1: Only send search when the user entered meaningful text.
      search: pageState.searchInput.trim() || undefined,

      // # Step 2: Keep optional filters nullable/undefined-safe.
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,

      // # Step 3: Archived-only mode should only send true when active.
      is_archived: pageState.showArchivedOnly ? true : undefined,
    };
  }, [
    pageState.searchInput,
    pageState.selectedCategoryId,
    pageState.selectedVendorId,
    pageState.showArchivedOnly,
  ]);

  const reportingFilters = useMemo<ExpenseListFilters>(() => {
    return {
      // # Step 1: Reporting currently follows category/vendor filters.
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,
    };
  }, [pageState.selectedCategoryId, pageState.selectedVendorId]);

  const expenseListQuery = useExpenseList(listFilters);
  const categoriesQuery = useExpenseCategories();
  const vendorsQuery = useExpenseVendors();
  const expenseDetailQuery = useExpenseDetail(pageState.editingExpenseId);

  const dashboardQuery = useExpenseDashboard(reportingFilters);
  const monthlyTrendQuery = useExpenseMonthlyTrend(reportingFilters);
  const byCategoryQuery = useExpenseByCategory(reportingFilters);
  const byBuildingQuery = useExpenseByBuilding(reportingFilters);

  const expenses = expenseListQuery.data?.items ?? [];
  const totalExpenseCount = expenseListQuery.data?.count ?? expenses.length;

  const reportingRecordCountHint = useMemo<number | null>(() => {
    // # Step 1: Only reuse the list count when it matches reporting scope.
    if (!canUseListCountAsReportingHint(pageState)) {
      return null;
    }

    // # Step 2: Provide a stable fallback signal for partial reporting UI.
    return totalExpenseCount;
  }, [pageState, totalExpenseCount]);

  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const formInitialValues = useMemo<Partial<ExpenseFormValues>>(() => {
    // # Step 1: Create mode should mount with a clean form contract.
    if (pageState.formMode === "create") {
      return {};
    }

    // # Step 2: Edit mode should map selected expense detail into form values.
    if (!expenseDetailQuery.data) {
      return {};
    }

    return mapExpenseToFormValues(expenseDetailQuery.data);
  }, [expenseDetailQuery.data, pageState.formMode]);

  const isListLoading = expenseListQuery.isLoading;
  const isExpenseDetailLoading =
    pageState.formMode === "edit" && expenseDetailQuery.isLoading;
  const isLookupLoading = categoriesQuery.isLoading || vendorsQuery.isLoading;

  const isReportingLoading =
    dashboardQuery.isLoading ||
    monthlyTrendQuery.isLoading ||
    byCategoryQuery.isLoading ||
    byBuildingQuery.isLoading;

  const reportingErrorMessage = useMemo(() => {
    const firstError =
      dashboardQuery.error ??
      monthlyTrendQuery.error ??
      byCategoryQuery.error ??
      byBuildingQuery.error;

    return firstError
      ? getExpensePageErrorMessage(
          firstError,
          "Unable to load expense reporting.",
        )
      : null;
  }, [
    dashboardQuery.error,
    monthlyTrendQuery.error,
    byCategoryQuery.error,
    byBuildingQuery.error,
  ]);

  const listErrorMessage = useMemo(() => {
    return expenseListQuery.error
      ? getExpensePageErrorMessage(
          expenseListQuery.error,
          "Unable to load expenses.",
        )
      : null;
  }, [expenseListQuery.error]);

  const lookupErrorMessage = useMemo(() => {
    const firstLookupError = categoriesQuery.error ?? vendorsQuery.error;

    return firstLookupError
      ? getExpensePageErrorMessage(
          firstLookupError,
          "Unable to load expense form options.",
        )
      : null;
  }, [categoriesQuery.error, vendorsQuery.error]);

  return {
    listFilters,
    reportingFilters,
    expenses,
    totalExpenseCount,
    reportingRecordCountHint,
    categories,
    vendors,

    // # Step 1: Let page state remain the source of truth for form mode.
    formMode: pageState.formMode,
    formInitialValues,

    dashboard: dashboardQuery.data ?? null,
    monthlyTrend: monthlyTrendQuery.data ?? null,
    byCategory: byCategoryQuery.data ?? null,
    byBuilding: byBuildingQuery.data ?? null,

    isListLoading,
    isExpenseDetailLoading,
    isReportingLoading,
    isLookupLoading,

    reportingErrorMessage,
    listErrorMessage,
    lookupErrorMessage,
    hasLookupError: Boolean(categoriesQuery.error || vendorsQuery.error),

    expenseListQuery,
    categoriesQuery,
    vendorsQuery,
    expenseDetailQuery,
    dashboardQuery,
    monthlyTrendQuery,
    byCategoryQuery,
    byBuildingQuery,
  };
}