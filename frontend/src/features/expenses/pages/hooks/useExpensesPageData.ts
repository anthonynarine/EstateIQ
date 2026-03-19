// # Filename: src/features/expenses/pages/hooks/useExpensesPageData.ts

import { useMemo } from "react";

import type { ExpenseFormValues } from "../components/ExpensesFormSection";
import { getExpensePageErrorMessage } from "../utils/expensePageErrors";
import { mapExpenseToFormValues } from "../utils/expensePageMappers";
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
  ExpenseDetail,
  ExpenseListFilters,
  ExpenseListItem,
  ExpenseMonthlyTrendResponse,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import type { UseExpensesPageStateResult } from "./useExpensesPageState";

/**
 * Derived data contract for the Expenses page orchestration layer.
 */
export interface UseExpensesPageDataResult {
  listFilters: ExpenseListFilters;
  reportingFilters: ExpenseListFilters;
  expenses: ExpenseListItem[];
  totalExpenseCount: number;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  formMode: "create" | "edit";
  formInitialValues: Partial<ExpenseFormValues>;
  dashboard: ExpenseDashboardResponse | null;
  monthlyTrend: ExpenseMonthlyTrendResponse | null;
  byCategory: ExpenseByCategoryResponse | null;
  byBuilding: ExpenseByBuildingResponse | null;
  isReportingLoading: boolean;
  reportingErrorMessage: string | null;
  listErrorMessage: string | null;
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

// ✅ New Code
export function useExpensesPageData(
  pageState: UseExpensesPageStateResult,
): UseExpensesPageDataResult {
  const listFilters = useMemo<ExpenseListFilters>(() => {
    return {
      search: pageState.searchInput.trim() || undefined,
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,
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
  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const formMode: "create" | "edit" = pageState.editingExpenseId
    ? "edit"
    : "create";

  const formInitialValues = useMemo<Partial<ExpenseFormValues>>(() => {
    if (!pageState.editingExpenseId) {
      return {};
    }

    return mapExpenseToFormValues(
      (expenseDetailQuery.data as ExpenseDetail | undefined) ?? null,
    );
  }, [expenseDetailQuery.data, pageState.editingExpenseId]);

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

  const listErrorMessage = expenseListQuery.error
    ? getExpensePageErrorMessage(
        expenseListQuery.error,
        "Unable to load expenses.",
      )
    : null;

  return {
    listFilters,
    reportingFilters,
    expenses,
    totalExpenseCount,
    categories,
    vendors,
    formMode,
    formInitialValues,
    dashboard: dashboardQuery.data ?? null,
    monthlyTrend: monthlyTrendQuery.data ?? null,
    byCategory: byCategoryQuery.data ?? null,
    byBuilding: byBuildingQuery.data ?? null,
    isReportingLoading,
    reportingErrorMessage,
    listErrorMessage,
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