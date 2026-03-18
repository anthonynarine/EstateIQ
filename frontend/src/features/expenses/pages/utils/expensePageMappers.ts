// # Filename: src/features/expenses/pages/utils/expensePageMappers.ts

import type { ExpenseFormValues } from "../components/ExpensesFormSection";
import type { ExpenseListItem } from "../../api/expensesTypes";

/**
 * Maps an expense record into form-friendly initial values.
 *
 * The form only owns a subset of the full expense record, so this mapper
 * keeps page orchestration clean and prevents inline translation logic.
 *
 * @param expense Expense record from list/detail queries.
 * @returns Partial form values suitable for edit mode initialization.
 */
export function mapExpenseToFormValues(
  expense: Partial<ExpenseListItem> | null | undefined,
): Partial<ExpenseFormValues> {
  // # Step 1: Guard against missing expense input.
  if (!expense) {
    return {};
  }

  // # Step 2: Map only the fields currently owned by the form.
  return {
    description: expense.description ?? "",
    amount:
      expense.amount !== undefined && expense.amount !== null
        ? String(expense.amount)
        : "",
    expense_date: expense.expense_date ?? "",
    notes: expense.notes ?? "",
    category_id: expense.category?.id ?? null,
    vendor_id: expense.vendor?.id ?? null,
  };
}