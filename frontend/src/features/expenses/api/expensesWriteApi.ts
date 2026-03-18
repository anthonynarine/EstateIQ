// # Filename: src/features/expenses/api/expensesWriteApi.ts

import api from "../../../api/axios";

import type {
  CreateExpensePayload,
  EntityId,
  ExpenseDetail,
  UpdateExpensePayload,
} from "./expensesTypes";

/**
 * Write-surface endpoint registry for the Expenses feature.
 *
 * This file owns mutation-oriented routes only.
 * Keep these paths centralized so hooks and UI components never hardcode
 * backend mutation URLs.
 */
export const EXPENSES_WRITE_ENDPOINTS = {
  expenses: "/expenses/",
} as const;

/**
 * Creates a new expense record.
 *
 * @param payload Validated expense form payload from the UI layer.
 * @returns The created expense record as returned by the backend.
 */
export async function createExpense(
  payload: CreateExpensePayload,
): Promise<ExpenseDetail> {
  // # Step 1: Create the expense through the primary expense endpoint.
  const response = await api.post<ExpenseDetail>(
    EXPENSES_WRITE_ENDPOINTS.expenses,
    payload,
  );

  return response.data;
}

/**
 * Partially updates an existing expense record.
 *
 * PATCH is the safest default here because:
 * - edit forms often submit changed fields only
 * - it avoids forcing the page layer to reconstruct a full object
 * - it aligns well with production-safe incremental updates
 *
 * @param expenseId Expense primary key.
 * @param payload Partial expense update payload.
 * @returns The updated expense record as returned by the backend.
 */
export async function updateExpense(
  expenseId: EntityId,
  payload: UpdateExpensePayload,
): Promise<ExpenseDetail> {
  // # Step 1: Guard against invalid mutation calls.
  if (!expenseId) {
    throw new Error("A valid expense ID is required to update an expense.");
  }

  // # Step 2: Send a partial update request to the detail endpoint.
  const response = await api.patch<ExpenseDetail>(
    `${EXPENSES_WRITE_ENDPOINTS.expenses}${expenseId}/`,
    payload,
  );

  return response.data;
}

/**
 * Archives an expense using the dedicated backend action route.
 *
 * @param expenseId Expense primary key.
 * @returns The updated archived expense record.
 */
export async function archiveExpense(
  expenseId: EntityId,
): Promise<ExpenseDetail> {
  // # Step 1: Guard against invalid mutation calls.
  if (!expenseId) {
    throw new Error("A valid expense ID is required to archive an expense.");
  }

  // # Step 2: Call the archive action endpoint.
  const response = await api.post<ExpenseDetail>(
    `${EXPENSES_WRITE_ENDPOINTS.expenses}${expenseId}/archive/`,
  );

  return response.data;
}

/**
 * Unarchives an expense using the dedicated backend action route.
 *
 * @param expenseId Expense primary key.
 * @returns The updated unarchived expense record.
 */
export async function unarchiveExpense(
  expenseId: EntityId,
): Promise<ExpenseDetail> {
  // # Step 1: Guard against invalid mutation calls.
  if (!expenseId) {
    throw new Error("A valid expense ID is required to unarchive an expense.");
  }

  // # Step 2: Call the unarchive action endpoint.
  const response = await api.post<ExpenseDetail>(
    `${EXPENSES_WRITE_ENDPOINTS.expenses}${expenseId}/unarchive/`,
  );

  return response.data;
}