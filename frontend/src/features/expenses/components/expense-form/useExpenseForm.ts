// # Filename: src/features/expenses/components/expense-form/useExpenseForm.ts

import { useCallback, useMemo, useState, type FormEvent } from "react";

import type {
  CreateExpensePayload,
  UpdateExpensePayload,
} from "../../api/expensesTypes";
import type { ExpenseFormValues } from "./expenseFormTypes";
import {
  buildCreateExpensePayload,
  buildInitialExpenseFormState,
  buildUpdateExpensePayload,
  getEmptyExpenseFormValues,
  validateExpenseForm,
} from "./expenseFormUtils";

type ExpenseFormMode = "create" | "edit";
type ExpenseSubmitPayload = CreateExpensePayload | UpdateExpensePayload;

interface UseExpenseFormArgs {
  mode: ExpenseFormMode;
  initialValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseSubmitPayload) => Promise<void> | void;
}

interface UseExpenseFormReturn {
  formValues: ExpenseFormValues;
  validationError: string | null;
  panelTitle: string;
  panelDescription: string;
  submitButtonLabel: string;
  updateField: (
    field: keyof ExpenseFormValues,
    value: ExpenseFormValues[keyof ExpenseFormValues],
  ) => void;
  resetForm: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * Manages local UI state for the expense create/edit form.
 *
 * Responsibilities:
 * - own form field state
 * - own lightweight validation state
 * - build the correct API payload for create vs edit mode
 * - reset the form only when that behavior is appropriate
 *
 * Important design note:
 * This hook initializes local state from `initialValues` once.
 * Because of that, the parent page should remount the form with a
 * mode/id-based `key` when switching between:
 * - create -> edit
 * - edit record A -> edit record B
 *
 * That keeps this hook simple and prevents sync-effect state bugs.
 *
 * @param args Hook configuration from the page/form panel.
 * @returns Form state and event handlers for the expense form UI.
 */
export function useExpenseForm({
  mode,
  initialValues,
  onSubmit,
}: UseExpenseFormArgs): UseExpenseFormReturn {
  const [formValues, setFormValues] = useState<ExpenseFormValues>(() =>
    buildInitialExpenseFormState(initialValues),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const panelTitle = useMemo(() => {
    return mode === "create" ? "Add Expense" : "Edit Expense";
  }, [mode]);

  const panelDescription = useMemo(() => {
    return mode === "create"
      ? "Create a new expense record for the portfolio."
      : "Update the selected expense record.";
  }, [mode]);

  const submitButtonLabel = useMemo(() => {
    return mode === "create" ? "Create Expense" : "Save Changes";
  }, [mode]);

  const updateField = useCallback(
    (
      field: keyof ExpenseFormValues,
      value: ExpenseFormValues[keyof ExpenseFormValues],
    ) => {
      // # Step 1: Update the requested field immutably.
      setFormValues((previousState) => ({
        ...previousState,
        [field]: value,
      }));

      // # Step 2: Clear stale validation once the user edits.
      setValidationError(null);
    },
    [],
  );

  const resetForm = useCallback(() => {
    // # Step 1: Reset back to empty create-state.
    setFormValues(getEmptyExpenseFormValues());

    // # Step 2: Clear any local validation message.
    setValidationError(null);
  }, []);

  const buildSubmitPayload = useCallback((): ExpenseSubmitPayload => {
    // # Step 1: Build the correct payload for the current form mode.
    if (mode === "create") {
      return buildCreateExpensePayload(formValues);
    }

    // # Step 2: Edit mode should only send fields this form owns.
    return buildUpdateExpensePayload(formValues);
  }, [formValues, mode]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // # Step 1: Validate before payload construction.
      const errorMessage = validateExpenseForm(formValues);
      if (errorMessage) {
        setValidationError(errorMessage);
        return;
      }

      try {
        // # Step 2: Build a mode-safe payload.
        const payload = buildSubmitPayload();

        // # Step 3: Delegate persistence to the caller.
        await onSubmit(payload);

        // # Step 4: Reset only after successful create.
        if (mode === "create") {
          resetForm();
        }
      } catch (error) {
        // # Step 5: Keep form values intact for retry/debugging.
        console.error("Failed to submit expense form:", error);
      }
    },
    [buildSubmitPayload, formValues, mode, onSubmit, resetForm],
  );

  return {
    formValues,
    validationError,
    panelTitle,
    panelDescription,
    submitButtonLabel,
    updateField,
    resetForm,
    handleSubmit,
  };
}