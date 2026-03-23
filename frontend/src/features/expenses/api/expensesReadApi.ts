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

const EXPENSES_API_PREFIX = "/api/v1";

/**
 * Read-surface endpoint registry for the Expenses feature.
 */
export const EXPENSES_READ_ENDPOINTS = {
  expenses: `${EXPENSES_API_PREFIX}/expenses/`,
  categories: `${EXPENSES_API_PREFIX}/expense-categories/`,
  vendors: `${EXPENSES_API_PREFIX}/vendors/`,
} as const;

export interface NormalizedCollectionResult<T> {
  items: T[];
  count: number;
  next: string | null;
  previous: string | null;
  isPaginated: boolean;
}

function isPaginatedResponse<T>(
  payload: CollectionResponse<T>,
): payload is PaginatedResponse<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "results" in payload &&
    "count" in payload &&
    Array.isArray(payload.results)
  );
}

/**
 * Builds a clean backend-safe params object from page filters.
 *
 * Important:
 * The frontend keeps UI-friendly `*_id` keys, but the backend mixin expects:
 * - building
 * - unit
 * - lease
 * - category
 * - vendor
 * - scope
 * - expense_date_from / expense_date_to
 * - due_date_from / due_date_to
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

  const params: Record<string, string | number | boolean> = {};

  // # Step 2: Map UI filter names to backend query param names.
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.scope) {
    params.scope = filters.scope;
  }

  if (filters.category_id !== undefined && filters.category_id !== null) {
    params.category = filters.category_id;
  }

  if (filters.vendor_id !== undefined && filters.vendor_id !== null) {
    params.vendor = filters.vendor_id;
  }

  if (filters.building_id !== undefined && filters.building_id !== null) {
    params.building = filters.building_id;
  }

  if (filters.unit_id !== undefined && filters.unit_id !== null) {
    params.unit = filters.unit_id;
  }

  if (filters.lease_id !== undefined && filters.lease_id !== null) {
    params.lease = filters.lease_id;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.reimbursement_status) {
    params.reimbursement_status = filters.reimbursement_status;
  }

  if (
    filters.is_reimbursable !== undefined &&
    filters.is_reimbursable !== null
  ) {
    params.is_reimbursable = filters.is_reimbursable;
  }

  if (filters.is_archived !== undefined && filters.is_archived !== null) {
    params.is_archived = filters.is_archived;
  }

  const expenseDateFrom = filters.expense_date_from ?? filters.date_from;
  const expenseDateTo = filters.expense_date_to ?? filters.date_to;

  if (expenseDateFrom) {
    params.expense_date_from = expenseDateFrom;
  }

  if (expenseDateTo) {
    params.expense_date_to = expenseDateTo;
  }

  if (filters.due_date_from) {
    params.due_date_from = filters.due_date_from;
  }

  if (filters.due_date_to) {
    params.due_date_to = filters.due_date_to;
  }

  if (filters.ordering) {
    params.ordering = filters.ordering;
  }

  if (filters.page !== undefined && filters.page !== null) {
    params.page = filters.page;
  }

  if (filters.page_size !== undefined && filters.page_size !== null) {
    params.page_size = filters.page_size;
  }

  if (filters.top_n !== undefined && filters.top_n !== null) {
    params.top_n = filters.top_n;
  }

  return params;
}

/**
 * Normalizes collection responses into one stable frontend shape.
 *
 * @param payload Raw API response payload.
 * @returns Normalized list result.
 */
export function normalizeCollectionResponse<T>(
  payload: CollectionResponse<T>,
): NormalizedCollectionResult<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
      isPaginated: false,
    };
  }

  if (isPaginatedResponse(payload)) {
    return {
      items: payload.results,
      count: payload.count,
      next: payload.next,
      previous: payload.previous,
      isPaginated: true,
    };
  }

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
  const params = buildExpenseListParams(filters);

  const response = await api.get<CollectionResponse<ExpenseListItem>>(
    EXPENSES_READ_ENDPOINTS.expenses,
    { params },
  );

  return normalizeCollectionResponse(response.data);
}

/**
 * Fetches a single expense detail record.
 *
 * @param expenseId Expense primary key.
 * @returns Expense detail payload.
 */
export async function getExpense(expenseId: EntityId): Promise<ExpenseDetail> {
  if (!expenseId) {
    throw new Error("A valid expense ID is required to fetch expense detail.");
  }

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
  const response = await api.get<CollectionResponse<ExpenseCategoryOption>>(
    EXPENSES_READ_ENDPOINTS.categories,
  );

  return normalizeCollectionResponse(response.data).items;
}

/**
 * Fetches the expense vendor lookup list.
 *
 * @returns Vendor options for forms/filters.
 */
export async function listExpenseVendors(): Promise<ExpenseVendorOption[]> {
  const response = await api.get<CollectionResponse<ExpenseVendorOption>>(
    EXPENSES_READ_ENDPOINTS.vendors,
  );

  return normalizeCollectionResponse(response.data).items;
}