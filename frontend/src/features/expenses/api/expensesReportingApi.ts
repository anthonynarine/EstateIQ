// # Filename: src/features/expenses/api/expensesReportingApi.ts

import api from "../../../api/axios";
import { reportDebug } from "../reporting/utils/reportingDebug";

import type {
  ExpenseByBuildingPoint,
  ExpenseByBuildingResponse,
  ExpenseByCategoryPoint,
  ExpenseByCategoryResponse,
  ExpenseDashboardResponse,
  ExpenseListFilters,
  ExpenseMonthlyTrendPoint,
  ExpenseMonthlyTrendResponse,
} from "./expensesTypes";
import { buildExpenseListParams } from "./expensesReadApi";

const EXPENSES_API_PREFIX = "/api/v1";

/**
 * Reporting-surface endpoint registry for the Expenses feature.
 *
 * Reporting stays separate from CRUD on purpose.
 * This keeps aggregate/chart APIs from turning the main expense
 * endpoint into a junk drawer.
 */
export const EXPENSES_REPORTING_ENDPOINTS = {
  root: `${EXPENSES_API_PREFIX}/expense-reporting/`,
  dashboard: `${EXPENSES_API_PREFIX}/expense-reporting/dashboard/`,
  monthlyTrend: `${EXPENSES_API_PREFIX}/expense-reporting/monthly-trend/`,
  byCategory: `${EXPENSES_API_PREFIX}/expense-reporting/by-category/`,
  byBuilding: `${EXPENSES_API_PREFIX}/expense-reporting/by-building/`,
} as const;

/**
 * Type guard for plain object-like API payloads.
 *
 * @param value Unknown API payload.
 * @returns True when the payload is a non-null object and not an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Emits a centralized reporting API debug log.
 *
 * @param stage Debug stage label.
 * @param endpoint Reporting endpoint path.
 * @param params Outgoing request params.
 * @param payload Optional raw or normalized payload.
 * @returns Void.
 */
function reportApiStage(
  stage: string,
  endpoint: string,
  params: Record<string, unknown>,
  payload?: unknown,
): void {
  // # Step 1: Emit a stable structured debug log for API tracing.
  reportDebug(`api ${stage}`, {
    endpoint,
    params,
    payload,
  });
}

/**
 * Normalizes a dashboard response into a safe object shape.
 *
 * The dashboard endpoint should conceptually return an object, but while
 * the slice is evolving we protect the UI from null/unsupported payloads.
 *
 * @param payload Raw API payload.
 * @returns Safe dashboard object for the hook/UI layer.
 */
function normalizeDashboardPayload(payload: unknown): ExpenseDashboardResponse {
  // # Step 1: Accept valid object payloads as-is.
  if (isRecord(payload)) {
    return payload as ExpenseDashboardResponse;
  }

  // # Step 2: Fall back to an empty object so the UI can render an honest
  // sparse state instead of crashing or treating the response as invalid.
  return {};
}

/**
 * Normalizes a trend payload into a collection-bearing response.
 *
 * Supports:
 * - plain array payloads
 * - object payloads with results/points/items/data
 * - null/unsupported payloads
 *
 * @param payload Raw API payload.
 * @returns Safe monthly trend response.
 */
function normalizeMonthlyTrendPayload(
  payload: unknown,
): ExpenseMonthlyTrendResponse {
  // # Step 1: Wrap plain arrays into a stable collection key.
  if (Array.isArray(payload)) {
    return {
      results: payload as ExpenseMonthlyTrendPoint[],
    };
  }

  // # Step 2: Accept object payloads as-is.
  if (isRecord(payload)) {
    return payload as ExpenseMonthlyTrendResponse;
  }

  // # Step 3: Return an empty collection shape for sparse/invalid payloads.
  return {
    results: [],
  };
}

/**
 * Normalizes a category breakdown payload into a collection-bearing response.
 *
 * Supports:
 * - plain array payloads
 * - object payloads with results/points/items/data
 * - null/unsupported payloads
 *
 * @param payload Raw API payload.
 * @returns Safe category breakdown response.
 */
function normalizeByCategoryPayload(
  payload: unknown,
): ExpenseByCategoryResponse {
  // # Step 1: Wrap plain arrays into a stable collection key.
  if (Array.isArray(payload)) {
    return {
      results: payload as ExpenseByCategoryPoint[],
    };
  }

  // # Step 2: Accept object payloads as-is.
  if (isRecord(payload)) {
    return payload as ExpenseByCategoryResponse;
  }

  // # Step 3: Return an empty collection shape for sparse/invalid payloads.
  return {
    results: [],
  };
}

/**
 * Normalizes a building breakdown payload into a collection-bearing response.
 *
 * Supports:
 * - plain array payloads
 * - object payloads with results/points/items/data
 * - null/unsupported payloads
 *
 * @param payload Raw API payload.
 * @returns Safe building breakdown response.
 */
function normalizeByBuildingPayload(
  payload: unknown,
): ExpenseByBuildingResponse {
  // # Step 1: Wrap plain arrays into a stable collection key.
  if (Array.isArray(payload)) {
    return {
      results: payload as ExpenseByBuildingPoint[],
    };
  }

  // # Step 2: Accept object payloads as-is.
  if (isRecord(payload)) {
    return payload as ExpenseByBuildingResponse;
  }

  // # Step 3: Return an empty collection shape for sparse/invalid payloads.
  return {
    results: [],
  };
}

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
  const endpoint = EXPENSES_REPORTING_ENDPOINTS.dashboard;

  reportApiStage("request", endpoint, params);

  // # Step 2: Request the dashboard reporting endpoint.
  const response = await api.get<unknown>(endpoint, {
    params,
  });

  reportApiStage("raw response", endpoint, params, response.data);

  // # Step 3: Normalize sparse/variable payloads before they reach the UI.
  const normalizedPayload = normalizeDashboardPayload(response.data);

  reportApiStage("normalized response", endpoint, params, normalizedPayload);

  return normalizedPayload;
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
  const endpoint = EXPENSES_REPORTING_ENDPOINTS.monthlyTrend;

  reportApiStage("request", endpoint, params);

  // # Step 2: Request the monthly trend reporting endpoint.
  const response = await api.get<unknown>(endpoint, { params });

  reportApiStage("raw response", endpoint, params, response.data);

  // # Step 3: Normalize sparse/variable payloads before they reach the UI.
  const normalizedPayload = normalizeMonthlyTrendPayload(response.data);

  reportApiStage("normalized response", endpoint, params, normalizedPayload);

  return normalizedPayload;
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
  const endpoint = EXPENSES_REPORTING_ENDPOINTS.byCategory;

  reportApiStage("request", endpoint, params);

  // # Step 2: Request the category breakdown reporting endpoint.
  const response = await api.get<unknown>(endpoint, { params });

  reportApiStage("raw response", endpoint, params, response.data);

  // # Step 3: Normalize sparse/variable payloads before they reach the UI.
  const normalizedPayload = normalizeByCategoryPayload(response.data);

  reportApiStage("normalized response", endpoint, params, normalizedPayload);

  return normalizedPayload;
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
  const endpoint = EXPENSES_REPORTING_ENDPOINTS.byBuilding;

  reportApiStage("request", endpoint, params);

  // # Step 2: Request the building breakdown reporting endpoint.
  const response = await api.get<unknown>(endpoint, { params });

  reportApiStage("raw response", endpoint, params, response.data);

  // # Step 3: Normalize sparse/variable payloads before they reach the UI.
  const normalizedPayload = normalizeByBuildingPayload(response.data);

  reportApiStage("normalized response", endpoint, params, normalizedPayload);

  return normalizedPayload;
}