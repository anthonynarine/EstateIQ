// # Filename: src/features/expenses/api/expensesReportingApi.ts

// ✅ New Code

import api from "../../../api/axios";

import type {
  ExpenseByBuildingResponse,
  ExpenseByCategoryResponse,
  ExpenseDashboardResponse,
  ExpenseListFilters,
  ExpenseMonthlyTrendResponse,
} from "./expensesTypes";
import { buildExpenseListParams } from "./expensesReadApi";

/**
 * Reporting-surface endpoint registry for the Expenses feature.
 *
 * Reporting stays separate from CRUD on purpose.
 * This keeps aggregate/chart APIs from turning the main expense
 * endpoint into a junk drawer.
 */
export const EXPENSES_REPORTING_ENDPOINTS = {
  root: "/expense-reporting/",
  dashboard: "/expense-reporting/dashboard/",
  monthlyTrend: "/expense-reporting/monthly-trend/",
  byCategory: "/expense-reporting/by-category/",
  byBuilding: "/expense-reporting/by-building/",
} as const;

/**
 * Fetches the expense dashboard summary payload.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns Dashboard response used for summary cards and high-level metrics.
 */
export async function getExpenseDashboard(
  filters?: ExpenseListFilters,
): Promise<ExpenseDashboardResponse> {
  // # Step 1: Normalize page filters into request params.
  const params = buildExpenseListParams(filters);

  // # Step 2: Request the dashboard reporting endpoint.
  const response = await api.get<ExpenseDashboardResponse>(
    EXPENSES_REPORTING_ENDPOINTS.dashboard,
    { params },
  );

  return response.data;
}

/**
 * Fetches monthly expense trend data.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns Monthly trend payload for line/bar chart rendering.
 */
export async function getExpenseMonthlyTrend(
  filters?: ExpenseListFilters,
): Promise<ExpenseMonthlyTrendResponse> {
  // # Step 1: Normalize page filters into request params.
  const params = buildExpenseListParams(filters);

  // # Step 2: Request the monthly trend reporting endpoint.
  const response = await api.get<ExpenseMonthlyTrendResponse>(
    EXPENSES_REPORTING_ENDPOINTS.monthlyTrend,
    { params },
  );

  return response.data;
}

/**
 * Fetches expense totals grouped by category.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns Category breakdown payload for pie charts and leaderboards.
 */
export async function getExpenseByCategory(
  filters?: ExpenseListFilters,
): Promise<ExpenseByCategoryResponse> {
  // # Step 1: Normalize page filters into request params.
  const params = buildExpenseListParams(filters);

  // # Step 2: Request the category breakdown reporting endpoint.
  const response = await api.get<ExpenseByCategoryResponse>(
    EXPENSES_REPORTING_ENDPOINTS.byCategory,
    { params },
  );

  return response.data;
}

/**
 * Fetches expense totals grouped by building.
 *
 * @param filters Optional reporting filters from the page layer.
 * @returns Building breakdown payload for comparison charts and tables.
 */
export async function getExpenseByBuilding(
  filters?: ExpenseListFilters,
): Promise<ExpenseByBuildingResponse> {
  // # Step 1: Normalize page filters into request params.
  const params = buildExpenseListParams(filters);

  // # Step 2: Request the building breakdown reporting endpoint.
  const response = await api.get<ExpenseByBuildingResponse>(
    EXPENSES_REPORTING_ENDPOINTS.byBuilding,
    { params },
  );

  return response.data;
}