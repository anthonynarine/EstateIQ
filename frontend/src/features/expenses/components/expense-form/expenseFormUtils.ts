// # Filename: src/features/expenses/components/expense-form/expenseFormUtils.ts

import type {
  CreateExpensePayload,
  ExpenseDetail,
  UpdateExpensePayload,
} from "../../api/expensesTypes";
import type { ExpenseFormValues } from "./expenseFormTypes";

/**
 * Returns the empty UI state for the expense form.
 *
 * The form intentionally stores amount as a string because:
 * - text inputs emit strings
 * - users may type partial numeric values
 * - validation should happen before payload construction
 *
 * @returns Empty form state for create mode.
 */
export function getEmptyExpenseFormValues(): ExpenseFormValues {
  return {
    description: "",
    amount: "",
    expense_date: "",
    notes: "",
    category_id: null,
    vendor_id: null,
  };
}

/**
 * Builds the initial form state from optional seed values.
 *
 * This keeps the form resilient whether it is opened in:
 * - create mode with no initial values
 * - edit mode with a partial seed object
 *
 * @param initialValues Optional initial values from the parent layer.
 * @returns Fully normalized form state.
 */
export function buildInitialExpenseFormState(
  initialValues?: Partial<ExpenseFormValues>,
): ExpenseFormValues {
  const emptyState = getEmptyExpenseFormValues();

  return {
    ...emptyState,
    ...initialValues,
    description: initialValues?.description ?? "",
    amount: initialValues?.amount ?? "",
    expense_date: initialValues?.expense_date ?? "",
    notes: initialValues?.notes ?? "",
    category_id: initialValues?.category_id ?? null,
    vendor_id: initialValues?.vendor_id ?? null,
  };
}

/**
 * Maps an expense detail record into editable form values.
 *
 * This isolates backend-to-form translation in one place so the page
 * layer does not need to understand nested expense relationships.
 *
 * @param expense Expense detail record from the API.
 * @returns Normalized form values for edit mode.
 */
export function buildExpenseFormValuesFromExpense(
  expense: ExpenseDetail,
): ExpenseFormValues {
  return {
    description: expense.description ?? expense.title ?? "",
    amount:
      typeof expense.amount === "number"
        ? String(expense.amount)
        : expense.amount ?? "",
    expense_date: expense.expense_date ?? "",
    notes: expense.notes ?? "",
    category_id: expense.category?.id ?? null,
    vendor_id: expense.vendor?.id ?? null,
  };
}

/**
 * Validates the current expense form values.
 *
 * This returns a single form-level error message for now because the
 * current UI is still lightweight. If the form grows later, this can be
 * expanded into a field-level error map without changing the rest of the
 * page orchestration.
 *
 * @param values Current form values.
 * @returns Validation error message or null when valid.
 */
export function validateExpenseForm(
  values: ExpenseFormValues,
): string | null {
  // # Step 1: Require description text.
  if (!values.description.trim()) {
    return "Description is required.";
  }

  // # Step 2: Require amount text.
  if (!values.amount.trim()) {
    return "Amount is required.";
  }

  // # Step 3: Validate numeric amount.
  const numericAmount = Number.parseFloat(values.amount);
  if (Number.isNaN(numericAmount)) {
    return "Amount must be a valid number.";
  }

  if (numericAmount < 0) {
    return "Amount cannot be negative.";
  }

  // # Step 4: Require expense date.
  if (!values.expense_date.trim()) {
    return "Expense date is required.";
  }

  return null;
}

/**
 * Normalizes shared scalar form values before payload construction.
 *
 * This helper prevents drift between create and update payload builders.
 *
 * @param values Current form values.
 * @returns Shared normalized scalar values.
 */
function normalizeExpenseFormValues(values: ExpenseFormValues) {
  const normalizedDescription = values.description.trim();
  const normalizedNotes = values.notes.trim();

  return {
    description: normalizedDescription,
    title: normalizedDescription,
    amount: values.amount.trim(),
    expense_date: values.expense_date.trim(),
    notes: normalizedNotes || undefined,
    category_id: values.category_id ?? null,
    vendor_id: values.vendor_id ?? null,
  };
}

/**
 * Builds the create payload for the current generic Expenses page form.
 *
 * Important:
 * This generic form still creates org-level expenses by default.
 * That is fine for the current slice because building/unit/lease-aware
 * entry points are planned for later.
 *
 * @param values Current validated form values.
 * @returns Create payload aligned to the backend write contract.
 */
export function buildCreateExpensePayload(
  values: ExpenseFormValues,
): CreateExpensePayload {
  const normalized = normalizeExpenseFormValues(values);

  return {
    // # Step 1: Default generic page creates to organization scope.
    scope: "organization",

    // # Step 2: Keep backend write contract aligned.
    title: normalized.title,
    description: normalized.description,

    // # Step 3: Normalize scalar fields.
    amount: normalized.amount,
    expense_date: normalized.expense_date,
    notes: normalized.notes,

    // # Step 4: Send nullable relationships explicitly for create.
    category_id: normalized.category_id,
    vendor_id: normalized.vendor_id,
    building_id: null,
    unit_id: null,
    lease_id: null,
  };
}

/**
 * Builds a partial update payload for edit mode.
 *
 * This intentionally does less than the create builder.
 * We only send fields the current form actually owns.
 *
 * Why this matters:
 * The current generic form does not edit building/unit/lease scope yet.
 * If we were to send those fields as null during edit, we could
 * accidentally wipe valid linkage on an existing record.
 *
 * @param values Current validated form values.
 * @returns Partial update payload safe for PATCH semantics.
 */
export function buildUpdateExpensePayload(
  values: ExpenseFormValues,
): UpdateExpensePayload {
  const normalized = normalizeExpenseFormValues(values);

  return {
    // ✅ New Code
    title: normalized.title,
    description: normalized.description,
    amount: normalized.amount,
    expense_date: normalized.expense_date,
    notes: normalized.notes,
    category_id: normalized.category_id,
    vendor_id: normalized.vendor_id,
  };
}