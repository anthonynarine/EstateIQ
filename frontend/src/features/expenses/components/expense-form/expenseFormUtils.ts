// # Filename: src/features/expenses/components/expense-form/expenseFormUtils.ts

import type {
  CreateExpensePayload,
  ExpenseScope,
  UpdateExpensePayload,
} from "../../api/expensesTypes";
import type { ExpenseFormValues } from "./expenseFormTypes";

/**
 * Returns today's date in YYYY-MM-DD format.
 *
 * @returns Current local date string for date input defaults.
 */
function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes a text field into either a trimmed string or undefined.
 *
 * @param value Raw text input value.
 * @returns Trimmed string or undefined when empty.
 */
function getOptionalTrimmedText(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}

/**
 * Returns a normalized scope value for the expense form.
 *
 * @param scope Raw form scope value.
 * @returns Safe expense scope.
 */
function normalizeScope(scope?: ExpenseScope): ExpenseScope {
  return scope ?? "organization";
}

/**
 * Clears incompatible relational fields based on scope.
 *
 * @param values Current form values.
 * @returns Scope-normalized values.
 */
function normalizeScopedFormValues(
  values: ExpenseFormValues,
): ExpenseFormValues {
  const scope = normalizeScope(values.scope);

  if (scope === "organization") {
    return {
      ...values,
      scope,
      building_id: null,
      unit_id: null,
      lease_id: null,
    };
  }

  if (scope === "building") {
    return {
      ...values,
      scope,
      unit_id: null,
      lease_id: null,
    };
  }

  if (scope === "unit") {
    return {
      ...values,
      scope,
      lease_id: null,
    };
  }

  return {
    ...values,
    scope,
  };
}

/**
 * Returns the empty/default state for the expense form.
 *
 * @returns Default form values for create mode.
 */
export function getEmptyExpenseFormValues(): ExpenseFormValues {
  return {
    description: "",
    amount: "",
    expense_date: getTodayDateString(),
    notes: "",
    category_id: null,
    vendor_id: null,
    scope: "organization",
    building_id: null,
    unit_id: null,
    lease_id: null,
  };
}

/**
 * Builds the initial form state from optional incoming values.
 *
 * @param initialValues Partial initial values from the page layer.
 * @returns Safe merged form state.
 */
export function buildInitialExpenseFormState(
  initialValues?: Partial<ExpenseFormValues>,
): ExpenseFormValues {
  return normalizeScopedFormValues({
    ...getEmptyExpenseFormValues(),
    ...initialValues,
  });
}

/**
 * Validates the expense form before submit.
 *
 * @param values Current form values.
 * @returns Human-readable validation message or null.
 */
export function validateExpenseForm(
  values: ExpenseFormValues,
): string | null {
  const normalizedValues = normalizeScopedFormValues(values);
  const scope = normalizeScope(normalizedValues.scope);
  const description = normalizedValues.description.trim();
  const parsedAmount = Number(normalizedValues.amount);

  if (!description) {
    return "Please enter an expense description.";
  }

  if (!normalizedValues.expense_date) {
    return "Please select an expense date.";
  }

  if (!normalizedValues.amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return "Please enter a valid expense amount greater than zero.";
  }

  if (scope === "building" && !normalizedValues.building_id) {
    return "Please select the building this expense belongs to.";
  }

  if (scope === "unit") {
    if (!normalizedValues.building_id) {
      return "Please select the building for this unit expense.";
    }

    if (!normalizedValues.unit_id) {
      return "Please select the unit this expense belongs to.";
    }
  }

  if (scope === "lease" && !normalizedValues.lease_id) {
    return "Please select the lease for this expense.";
  }

  return null;
}

/**
 * Builds the create payload expected by the backend.
 *
 * Important:
 * - `title` is the canonical backend write field
 * - `description` is still included for contract-transition safety
 *
 * @param values Current form values.
 * @returns Scoped create payload.
 */
export function buildCreateExpensePayload(
  values: ExpenseFormValues,
): CreateExpensePayload {
  const normalizedValues = normalizeScopedFormValues(values);
  const scope = normalizeScope(normalizedValues.scope);
  const description = normalizedValues.description.trim();

  return {
    scope,
    title: description,
    description,
    amount: normalizedValues.amount.trim(),
    expense_date: normalizedValues.expense_date,
    notes: getOptionalTrimmedText(normalizedValues.notes),
    category_id: normalizedValues.category_id ?? null,
    vendor_id: normalizedValues.vendor_id ?? null,
    building_id:
      scope === "building" || scope === "unit"
        ? normalizedValues.building_id ?? null
        : null,
    unit_id: scope === "unit" ? normalizedValues.unit_id ?? null : null,
    lease_id: scope === "lease" ? normalizedValues.lease_id ?? null : null,
  };
}

/**
 * Builds the update payload expected by the backend.
 *
 * @param values Current form values.
 * @returns Scoped partial update payload.
 */
export function buildUpdateExpensePayload(
  values: ExpenseFormValues,
): UpdateExpensePayload {
  const normalizedValues = normalizeScopedFormValues(values);
  const scope = normalizeScope(normalizedValues.scope);
  const description = normalizedValues.description.trim();

  return {
    scope,
    title: description,
    description,
    amount: normalizedValues.amount.trim(),
    expense_date: normalizedValues.expense_date,
    notes: getOptionalTrimmedText(normalizedValues.notes),
    category_id: normalizedValues.category_id ?? null,
    vendor_id: normalizedValues.vendor_id ?? null,
    building_id:
      scope === "building" || scope === "unit"
        ? normalizedValues.building_id ?? null
        : null,
    unit_id: scope === "unit" ? normalizedValues.unit_id ?? null : null,
    lease_id: scope === "lease" ? normalizedValues.lease_id ?? null : null,
  };
}