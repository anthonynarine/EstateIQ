// # Filename: src/features/expenses/pages/utils/expensePageMappers.ts

import type { ExpenseFormValues } from "../components/ExpensesFormSection";
import type { ExpenseDetail, ExpenseListItem } from "../../api/expensesTypes";

type ExpenseRecord = ExpenseDetail | ExpenseListItem;

/**
 * Safely resolves a nested or direct relation id from an expense record.
 *
 * @param record Expense record.
 * @param relationKey Nested relation key.
 * @param directKey Optional direct id key.
 * @returns Relation id or null.
 */
function getRelationId(
  record: ExpenseRecord,
  relationKey: "category" | "vendor",
  directKey: "category_id" | "vendor_id",
): number | null {
  const nestedRelation = record[relationKey];

  if (
    nestedRelation &&
    typeof nestedRelation === "object" &&
    "id" in nestedRelation &&
    typeof nestedRelation.id === "number"
  ) {
    return nestedRelation.id;
  }

  const directValue = (record as Record<string, unknown>)[directKey];
  return typeof directValue === "number" ? directValue : null;
}

/**
 * Maps an expense record into form-friendly initial values.
 *
 * @param expense Expense detail or list item.
 * @returns Partial form values for edit mode.
 */
export function mapExpenseToFormValues(
  expense: ExpenseRecord | null,
): Partial<ExpenseFormValues> {
  // # Step 1: Return an empty shape when there is no record.
  if (!expense) {
    return {};
  }

  // # Step 2: Normalize data for the reusable form panel.
  return {
    description: expense.description ?? "",
    amount:
      expense.amount === null || expense.amount === undefined
        ? ""
        : String(expense.amount),
    expense_date: expense.expense_date
      ? expense.expense_date.slice(0, 10)
      : "",
    notes: expense.notes ?? "",
    category_id: getRelationId(expense, "category", "category_id"),
    vendor_id: getRelationId(expense, "vendor", "vendor_id"),
  };
}