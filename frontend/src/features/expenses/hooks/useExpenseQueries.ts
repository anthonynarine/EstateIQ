// # Filename: src/features/expenses/hooks/useExpenseQueries.ts

import { useQuery } from "@tanstack/react-query";

import { expenseQueryKeys } from "../api/expenseQueryKeys";
import {
  getExpenseDashboard,
  getExpenseByBuilding,
  getExpenseByCategory,
  getExpenseMonthlyTrend,
} from "../api/expensesReportingApi";
import {
  getExpense,
  listExpenseCategories,
  listExpenseVendors,
  listExpenses,
} from "../api/expensesReadApi";
import type { EntityId, ExpenseListFilters } from "../api/expensesTypes";

/**
 * Query hook for the expense list surface.
 *
 * This hook owns:
 * - expense list retrieval
 * - expense list cache identity
 * - expense list filter-aware refetching
 *
 * The page layer should pass UI filter state here and render from the
 * normalized collection result returned by the read API layer.
 *
 * @param filters Optional page-level list filters.
 * @returns TanStack Query result for the expense list.
 */
export function useExpenseList(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.list(filters),
    queryFn: async () => listExpenses(filters),
  });
}

/**
 * Query hook for a single expense detail record.
 *
 * The hook is disabled until a valid expense ID is present.
 * This avoids accidental requests when the page is still in "create"
 * mode or when an edit target has not been selected yet.
 *
 * @param expenseId Expense primary key.
 * @returns TanStack Query result for a single expense record.
 */
export function useExpenseDetail(expenseId?: EntityId | null) {
  return useQuery({
    queryKey: expenseQueryKeys.detail(expenseId ?? 0),
    queryFn: async () => getExpense(expenseId as EntityId),
    enabled: Boolean(expenseId),
  });
}

/**
 * Query hook for expense category lookup options.
 *
 * Used by:
 * - create/edit forms
 * - filter controls
 *
 * @returns TanStack Query result for expense categories.
 */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseQueryKeys.categories(),
    queryFn: async () => listExpenseCategories(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for expense vendor lookup options.
 *
 * Used by:
 * - create/edit forms
 * - filter controls
 *
 * @returns TanStack Query result for expense vendors.
 */
export function useExpenseVendors() {
  return useQuery({
    queryKey: expenseQueryKeys.vendors(),
    queryFn: async () => listExpenseVendors(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for the expense dashboard reporting payload.
 *
 * This should stay separate from CRUD query logic even if both are
 * rendered on the same page.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns TanStack Query result for dashboard metrics.
 */
export function useExpenseDashboard(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseQueryKeys.dashboard(filters),
    queryFn: async () => getExpenseDashboard(filters),
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
    queryFn: async () => getExpenseMonthlyTrend(filters),
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
    queryFn: async () => getExpenseByCategory(filters),
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
    queryFn: async () => getExpenseByBuilding(filters),
  });
}