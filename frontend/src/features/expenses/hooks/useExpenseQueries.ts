// # Filename: src/features/expenses/hooks/useExpenseQueries.ts

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { expenseQueryKeys } from "../api/expenseQueryKeys";
import {
  getExpenseByBuilding,
  getExpenseByCategory,
  getExpenseDashboard,
  getExpenseMonthlyTrend,
} from "../api/expensesReportingApi";
import {
  getExpense,
  listExpenseCategories,
  listExpenseVendors,
  listExpenses,
} from "../api/expensesReadApi";
import type {
  CollectionResponse,
  EntityId,
  ExpenseByBuildingPoint,
  ExpenseByBuildingResponse,
  ExpenseByCategoryPoint,
  ExpenseByCategoryResponse,
  ExpenseCategoryOption,
  ExpenseDashboardResponse,
  ExpenseListFilters,
  ExpenseMonthlyTrendPoint,
  ExpenseMonthlyTrendResponse,
  ExpenseVendorOption,
} from "../api/expensesTypes";

const LOOKUP_STALE_TIME_MS = 1000 * 60 * 5;
const DETAIL_STALE_TIME_MS = 1000 * 60;
const REPORTING_STALE_TIME_MS = 1000 * 30;

/**
 * Safely normalizes a collection response into a plain array.
 *
 * Supports both:
 * - direct array responses
 * - DRF paginated responses with `results`
 *
 * @param response Raw collection payload from the API.
 * @returns A stable array for UI consumers.
 */
function normalizeCollectionResponse<T>(
  response: CollectionResponse<T> | undefined | null,
): T[] {
  // # Step 1: Treat missing data as an empty array.
  if (!response) {
    return [];
  }

  // # Step 2: Support non-paginated list responses.
  if (Array.isArray(response)) {
    return response;
  }

  // # Step 3: Support DRF paginated list responses.
  return response.results ?? [];
}

/**
 * Normalizes dashboard payload shape so UI components can safely assume
 * the metrics array always exists.
 *
 * @param response Raw dashboard response from the API.
 * @returns Normalized dashboard response.
 */
function normalizeExpenseDashboardResponse(
  response: ExpenseDashboardResponse,
): ExpenseDashboardResponse {
  return {
    ...response,
    metrics: response.metrics ?? [],
  };
}

/**
 * Normalizes monthly trend payload shape so chart components can safely
 * read `points` even if the backend serializer returns `results`.
 *
 * @param response Raw monthly trend response from the API.
 * @returns Normalized monthly trend response.
 */
function normalizeExpenseMonthlyTrendResponse(
  response: ExpenseMonthlyTrendResponse,
): ExpenseMonthlyTrendResponse {
  const points: ExpenseMonthlyTrendPoint[] =
    response.points ?? response.results ?? [];

  return {
    ...response,
    points,
    results: response.results ?? points,
  };
}

/**
 * Normalizes category reporting payload shape so the UI can consistently
 * render from `points`.
 *
 * @param response Raw category reporting response from the API.
 * @returns Normalized category reporting response.
 */
function normalizeExpenseByCategoryResponse(
  response: ExpenseByCategoryResponse,
): ExpenseByCategoryResponse {
  const points: ExpenseByCategoryPoint[] =
    response.points ?? response.results ?? [];

  return {
    ...response,
    points,
    results: response.results ?? points,
  };
}

/**
 * Normalizes building reporting payload shape so the UI can consistently
 * render from `points`.
 *
 * @param response Raw building reporting response from the API.
 * @returns Normalized building reporting response.
 */
function normalizeExpenseByBuildingResponse(
  response: ExpenseByBuildingResponse,
): ExpenseByBuildingResponse {
  const points: ExpenseByBuildingPoint[] =
    response.points ?? response.results ?? [];

  return {
    ...response,
    points,
    results: response.results ?? points,
  };
}

/**
 * Query hook for the expense list surface.
 *
 * @param filters Optional page-level list filters.
 * @returns TanStack Query result for the expense list.
 */
export function useExpenseList(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.list(filters),
    queryFn: async () => await listExpenses(filters),
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for a single expense detail record.
 *
 * @param expenseId Expense primary key.
 * @returns TanStack Query result for a single expense record.
 */
export function useExpenseDetail(expenseId?: EntityId | null) {
  return useQuery({
    queryKey: expenseQueryKeys.detail(expenseId ?? 0),
    queryFn: async () => await getExpense(expenseId as EntityId),
    enabled: Boolean(expenseId),
    staleTime: DETAIL_STALE_TIME_MS,
  });
}

/**
 * Query hook for expense category lookup options.
 *
 * Always returns a plain array regardless of backend pagination shape.
 *
 * @returns TanStack Query result for expense categories.
 */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseQueryKeys.categories(),
    queryFn: async () => await listExpenseCategories(),
    select: (
      response: CollectionResponse<ExpenseCategoryOption>,
    ): ExpenseCategoryOption[] => normalizeCollectionResponse(response),
    staleTime: LOOKUP_STALE_TIME_MS,
  });
}

/**
 * Query hook for expense vendor lookup options.
 *
 * Always returns a plain array regardless of backend pagination shape.
 *
 * @returns TanStack Query result for expense vendors.
 */
export function useExpenseVendors() {
  return useQuery({
    queryKey: expenseQueryKeys.vendors(),
    queryFn: async () => await listExpenseVendors(),
    select: (
      response: CollectionResponse<ExpenseVendorOption>,
    ): ExpenseVendorOption[] => normalizeCollectionResponse(response),
    staleTime: LOOKUP_STALE_TIME_MS,
  });
}

/**
 * Query hook for the expense dashboard reporting payload.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns TanStack Query result for dashboard metrics.
 */
export function useExpenseDashboard(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.dashboard(filters),
    queryFn: async () => await getExpenseDashboard(filters),
    select: normalizeExpenseDashboardResponse,
    staleTime: REPORTING_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for monthly expense trend data.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns TanStack Query result for monthly trend reporting.
 */
export function useExpenseMonthlyTrend(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.monthlyTrend(filters),
    queryFn: async () => await getExpenseMonthlyTrend(filters),
    select: normalizeExpenseMonthlyTrendResponse,
    staleTime: REPORTING_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for category breakdown reporting.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns TanStack Query result for expense-by-category reporting.
 */
export function useExpenseByCategory(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.byCategory(filters),
    queryFn: async () => await getExpenseByCategory(filters),
    select: normalizeExpenseByCategoryResponse,
    staleTime: REPORTING_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for building breakdown reporting.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns TanStack Query result for expense-by-building reporting.
 */
export function useExpenseByBuilding(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.byBuilding(filters),
    queryFn: async () => await getExpenseByBuilding(filters),
    select: normalizeExpenseByBuildingResponse,
    staleTime: REPORTING_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}