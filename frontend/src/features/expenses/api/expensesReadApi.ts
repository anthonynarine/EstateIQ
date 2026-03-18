// # Filename: src/features/expenses/api/expensesReadApi.ts


import api from "../../../api/axios";

import type {
  CollectionResponse,
  EntityId,
  ExpenseCategoryOption,
  ExpenseDetail,
  ExpenseListFilters,
  ExpenseListItem,
  ExpenseVendorOption,
  PaginatedResponse,
} from "./expensesTypes";

/**
 * Read-surface endpoint registry for the Expenses feature.
 *
 * Keep backend route strings centralized here so that:
 * - hooks stay clean
 * - page/components never hardcode API paths
 * - contract changes are isolated to one layer
 *
 * Update these paths here only if your DRF router names differ.
 */
export const EXPENSES_READ_ENDPOINTS = {
  expenses: "/expenses/",
  categories: "/expense-categories/",
  vendors: "/expense-vendors/",
} as const;

/**
 * Normalized list response returned to the hook layer.
 *
 * This lets the UI consume expense/category/vendor collections consistently
 * whether the backend returns:
 * - a plain array
 * - or a DRF paginated payload
 */
export interface NormalizedCollectionResult<T> {
  items: T[];
  count: number | null;
  next: string | null;
  previous: string | null;
  isPaginated: boolean;
}

/**
 * Type guard for the common DRF paginated response shape.
 *
 * @param value Unknown collection payload from the API.
 * @returns True when the payload matches DRF pagination structure.
 */
export function isPaginatedResponse<T>(
  value: CollectionResponse<T>,
): value is PaginatedResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "results" in value &&
    Array.isArray((value as PaginatedResponse<T>).results)
  );
}

/**
 * Builds safe axios params from frontend expense filter state.
 *
 * Rules:
 * - omit undefined
 * - omit null
 * - omit empty strings
 * - preserve false and 0 because they are valid query values
 *
 * @param filters Raw filter state from the page layer.
 * @returns Clean query params object for axios.
 */
export function buildExpenseListParams(
  filters?: ExpenseListFilters,
): Record<string, string | number | boolean> {
  // # Step 1: Return empty params when no filters exist.
  if (!filters) {
    return {};
  }

  // # Step 2: Remove values that should not be sent to the backend.
  const cleanedEntries = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "string" && value.trim() === "") {
      return false;
    }

    return true;
  });

  // # Step 3: Rebuild a backend-safe params object.
  return Object.fromEntries(cleanedEntries) as Record<
    string,
    string | number | boolean
  >;
}

/**
 * Normalizes collection responses into one stable frontend shape.
 *
 * Supported backend list shapes:
 * - plain array
 * - DRF paginated response
 *
 * @param payload Raw API response payload.
 * @returns Normalized list result.
 * @throws Error when the backend returns an unsupported shape.
 */
export function normalizeCollectionResponse<T>(
  payload: CollectionResponse<T>,
): NormalizedCollectionResult<T> {
  // # Step 1: Handle plain array responses.
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
      isPaginated: false,
    };
  }

  // # Step 2: Handle DRF paginated responses.
  if (isPaginatedResponse(payload)) {
    return {
      items: payload.results,
      count: payload.count,
      next: payload.next,
      previous: payload.previous,
      isPaginated: true,
    };
  }

  // # Step 3: Fail loudly if the contract is not one of the supported shapes.
  throw new Error("Unsupported collection response shape received from API.");
}

/**
 * Fetches the expenses list.
 *
 * @param filters Optional page-level filters.
 * @returns Normalized expense collection result.
 */
export async function listExpenses(
  filters?: ExpenseListFilters,
): Promise<NormalizedCollectionResult<ExpenseListItem>> {
  // # Step 1: Build clean query params from filter state.
  const params = buildExpenseListParams(filters);

  // # Step 2: Request the expense list endpoint.
  const response = await api.get<CollectionResponse<ExpenseListItem>>(
    EXPENSES_READ_ENDPOINTS.expenses,
    { params },
  );

  // # Step 3: Normalize the backend response for the hook layer.
  return normalizeCollectionResponse(response.data);
}

/**
 * Fetches a single expense detail record.
 *
 * @param expenseId Expense primary key.
 * @returns Expense detail payload.
 */
export async function getExpense(expenseId: EntityId): Promise<ExpenseDetail> {
  // # Step 1: Guard against invalid calls early.
  if (!expenseId) {
    throw new Error("A valid expense ID is required to fetch expense detail.");
  }

  // # Step 2: Request the detail endpoint.
  const response = await api.get<ExpenseDetail>(
    `${EXPENSES_READ_ENDPOINTS.expenses}${expenseId}/`,
  );

  return response.data;
}

/**
 * Fetches the expense category lookup list.
 *
 * @returns Category options for forms/filters.
 */
export async function listExpenseCategories(): Promise<
  ExpenseCategoryOption[]
> {
  // # Step 1: Request the dedicated category lookup endpoint.
  const response = await api.get<CollectionResponse<ExpenseCategoryOption>>(
    EXPENSES_READ_ENDPOINTS.categories,
  );

  // # Step 2: Normalize and return just the item array.
  return normalizeCollectionResponse(response.data).items;
}

/**
 * Fetches the expense vendor lookup list.
 *
 * @returns Vendor options for forms/filters.
 */
export async function listExpenseVendors(): Promise<ExpenseVendorOption[]> {
  // # Step 1: Request the dedicated vendor lookup endpoint.
  const response = await api.get<CollectionResponse<ExpenseVendorOption>>(
    EXPENSES_READ_ENDPOINTS.vendors,
  );

  // # Step 2: Normalize and return just the item array.
  return normalizeCollectionResponse(response.data).items;
}