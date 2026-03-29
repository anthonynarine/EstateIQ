// # Filename: src/features/expenses/pages/hooks/useExpensesPageData.ts

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import type { ExpenseFormValues } from "../../components/expense-form/expenseFormTypes";
import {
  useExpenseByBuilding,
  useExpenseByCategory,
  useExpenseByUnit,
  useExpenseCategories,
  useExpenseDashboard,
  useExpenseDetail,
  useExpenseList,
  useExpenseMonthlyTrend,
  useExpenseVendors,
} from "../../hooks/useExpenseQueries";
import type {
  ExpenseBuildingOption,
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseByUnitResponse,
  ExpenseCategoryOption,
  ExpenseDashboardResponse,
  ExpenseListFilters,
  ExpenseListItem,
  ExpenseMonthlyTrendResponse,
  ExpenseUnitOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import type { UseExpensesPageStateResult } from "./useExpensesPageState";
import { getExpensePageErrorMessage } from "../utils/expensePageErrors";
import { mapExpenseToFormValues } from "../utils/expensePageMappers";
import { listBuildings } from "../../../buildings/api/buildingsApi";
import { listUnitsByBuilding } from "../../../buildings/api/unitsApi";

export interface UseExpensesPageDataResult {
  listFilters: ExpenseListFilters;
  reportingRollupFilters: ExpenseListFilters;
  unitComparisonFilters: ExpenseListFilters;
  expenses: ExpenseListItem[];
  totalExpenseCount: number;
  reportingRecordCountHint: number | null;

  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];

  buildingOptions: ExpenseBuildingOption[];
  unitOptions: ExpenseUnitOption[];

  formMode: "create" | "edit";
  formInitialValues: Partial<ExpenseFormValues>;

  dashboard: ExpenseDashboardResponse | null;
  monthlyTrend: ExpenseMonthlyTrendResponse | null;
  byCategory: ExpenseByCategoryResponse | null;
  byBuilding: ExpenseByBuildingResponse | null;
  byUnit: ExpenseByUnitResponse | null;

  isListLoading: boolean;
  isExpenseDetailLoading: boolean;
  isReportingLoading: boolean;
  isLookupLoading: boolean;
  isPropertyLookupLoading: boolean;

  reportingErrorMessage: string | null;
  listErrorMessage: string | null;
  lookupErrorMessage: string | null;
  propertyLookupErrorMessage: string | null;

  hasLookupError: boolean;

  expenseListQuery: ReturnType<typeof useExpenseList>;
  categoriesQuery: ReturnType<typeof useExpenseCategories>;
  vendorsQuery: ReturnType<typeof useExpenseVendors>;
  expenseDetailQuery: ReturnType<typeof useExpenseDetail>;
  dashboardQuery: ReturnType<typeof useExpenseDashboard>;
  monthlyTrendQuery: ReturnType<typeof useExpenseMonthlyTrend>;
  byCategoryQuery: ReturnType<typeof useExpenseByCategory>;
  byBuildingQuery: ReturnType<typeof useExpenseByBuilding>;
  byUnitQuery: ReturnType<typeof useExpenseByUnit>;
}

function canUseListCountAsReportingHint(
  pageState: UseExpensesPageStateResult,
): boolean {
  if (pageState.searchInput.trim()) {
    return false;
  }

  if (pageState.showArchivedOnly) {
    return false;
  }

  return true;
}

function mapBuildingToOption(building: { id: number; name: string }) {
  return {
    id: building.id,
    name: building.name,
  };
}

function mapUnitToOption(unit: { id: number; label: string; building: number }) {
  return {
    id: unit.id,
    name: unit.label,
    unit_number: unit.label,
    building_id: unit.building,
  };
}

export function useExpensesPageData(
  pageState: UseExpensesPageStateResult,
): UseExpensesPageDataResult {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("org");

  const listFilters = useMemo<ExpenseListFilters>(() => {
    return {
      search: pageState.searchInput.trim() || undefined,
      scope: pageState.selectedScope ?? undefined,
      building_id: pageState.selectedBuildingId,
      unit_id: pageState.selectedUnitId,
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,
      is_archived: pageState.showArchivedOnly ? true : undefined,
      page: pageState.page,
      page_size: pageState.pageSize,
    };
  }, [
    pageState.searchInput,
    pageState.selectedScope,
    pageState.selectedBuildingId,
    pageState.selectedUnitId,
    pageState.selectedCategoryId,
    pageState.selectedVendorId,
    pageState.showArchivedOnly,
    pageState.page,
    pageState.pageSize,
  ]);

  const reportingRollupFilters = useMemo<ExpenseListFilters>(() => {
    return {
      building_id: pageState.selectedBuildingId,
      unit_id: pageState.selectedUnitId,
      scope: pageState.selectedScope ?? undefined,
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,
    };
  }, [
    pageState.selectedBuildingId,
    pageState.selectedUnitId,
    pageState.selectedScope,
    pageState.selectedCategoryId,
    pageState.selectedVendorId,
  ]);

  const unitComparisonFilters = useMemo<ExpenseListFilters>(() => {
    return {
      building_id: pageState.selectedBuildingId,
      scope: pageState.selectedScope ?? undefined,
      category_id: pageState.selectedCategoryId,
      vendor_id: pageState.selectedVendorId,
    };
  }, [
    pageState.selectedBuildingId,
    pageState.selectedScope,
    pageState.selectedCategoryId,
    pageState.selectedVendorId,
  ]);

  const expenseListQuery = useExpenseList(listFilters);
  const categoriesQuery = useExpenseCategories();
  const vendorsQuery = useExpenseVendors();
  const expenseDetailQuery = useExpenseDetail(pageState.editingExpenseId);

  const dashboardQuery = useExpenseDashboard(reportingRollupFilters);
  const monthlyTrendQuery = useExpenseMonthlyTrend(reportingRollupFilters);
  const byCategoryQuery = useExpenseByCategory(reportingRollupFilters);
  const byBuildingQuery = useExpenseByBuilding(reportingRollupFilters);
  const byUnitQuery = useExpenseByUnit(unitComparisonFilters);

  const buildingsQuery = useQuery({
    queryKey: ["org", orgSlug, "expenses-page", "buildings"],
    queryFn: async () => {
      if (!orgSlug) {
        return [];
      }

      const response = await listBuildings({
        orgSlug,
        page: 1,
        pageSize: 250,
        ordering: "name",
      });

      return response.results;
    },
    enabled: Boolean(orgSlug),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const unitsQuery = useQuery({
    queryKey: [
      "org",
      orgSlug,
      "expenses-page",
      "units",
      pageState.selectedBuildingId,
    ],
    queryFn: async () => {
      if (!orgSlug || !pageState.selectedBuildingId) {
        return [];
      }

      const response = await listUnitsByBuilding({
        orgSlug,
        buildingId: pageState.selectedBuildingId,
        page: 1,
        pageSize: 250,
        ordering: "label",
      });

      return response.results;
    },
    enabled: Boolean(orgSlug && pageState.selectedBuildingId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const expenses = expenseListQuery.data?.items ?? [];
  const totalExpenseCount = expenseListQuery.data?.count ?? 0;

  const reportingRecordCountHint = useMemo<number | null>(() => {
    if (!canUseListCountAsReportingHint(pageState)) {
      return null;
    }

    return totalExpenseCount;
  }, [pageState.searchInput, pageState.showArchivedOnly, totalExpenseCount]);

  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const buildingOptions = useMemo<ExpenseBuildingOption[]>(() => {
    return (buildingsQuery.data ?? []).map(mapBuildingToOption);
  }, [buildingsQuery.data]);

  const unitOptions = useMemo<ExpenseUnitOption[]>(() => {
    return (unitsQuery.data ?? []).map(mapUnitToOption);
  }, [unitsQuery.data]);

  const formInitialValues = useMemo<Partial<ExpenseFormValues>>(() => {
    if (pageState.formMode === "create") {
      return {};
    }

    if (!expenseDetailQuery.data) {
      return {};
    }

    return mapExpenseToFormValues(expenseDetailQuery.data);
  }, [expenseDetailQuery.data, pageState.formMode]);

  const isListLoading = expenseListQuery.isLoading;
  const isExpenseDetailLoading =
    pageState.formMode === "edit" && expenseDetailQuery.isLoading;
  const isLookupLoading = categoriesQuery.isLoading || vendorsQuery.isLoading;
  const isPropertyLookupLoading =
    buildingsQuery.isLoading || unitsQuery.isLoading;

  const isReportingLoading =
    dashboardQuery.isLoading ||
    monthlyTrendQuery.isLoading ||
    byCategoryQuery.isLoading ||
    byBuildingQuery.isLoading ||
    byUnitQuery.isLoading;

  const reportingErrorMessage = useMemo(() => {
    const firstError =
      dashboardQuery.error ??
      monthlyTrendQuery.error ??
      byCategoryQuery.error ??
      byBuildingQuery.error ??
      byUnitQuery.error;

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
    byUnitQuery.error,
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

  const propertyLookupErrorMessage = useMemo(() => {
    const firstPropertyLookupError = buildingsQuery.error ?? unitsQuery.error;

    return firstPropertyLookupError
      ? getExpensePageErrorMessage(
          firstPropertyLookupError,
          "Unable to load building or unit filters.",
        )
      : null;
  }, [buildingsQuery.error, unitsQuery.error]);

  return {
    listFilters,
    reportingRollupFilters,
    unitComparisonFilters,
    expenses,
    totalExpenseCount,
    reportingRecordCountHint,
    categories,
    vendors,
    buildingOptions,
    unitOptions,
    formMode: pageState.formMode,
    formInitialValues,
    dashboard: dashboardQuery.data ?? null,
    monthlyTrend: monthlyTrendQuery.data ?? null,
    byCategory: byCategoryQuery.data ?? null,
    byBuilding: byBuildingQuery.data ?? null,
    byUnit: byUnitQuery.data ?? null,
    isListLoading,
    isExpenseDetailLoading,
    isReportingLoading,
    isLookupLoading,
    isPropertyLookupLoading,
    reportingErrorMessage,
    listErrorMessage,
    lookupErrorMessage,
    propertyLookupErrorMessage,
    hasLookupError: Boolean(categoriesQuery.error || vendorsQuery.error),
    expenseListQuery,
    categoriesQuery,
    vendorsQuery,
    expenseDetailQuery,
    dashboardQuery,
    monthlyTrendQuery,
    byCategoryQuery,
    byBuildingQuery,
    byUnitQuery,
  };
}