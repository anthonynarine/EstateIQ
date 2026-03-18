// # Filename: src/features/expenses/components/ExpenseFormPanel.tsx


import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CreateExpensePayload,
  ExpenseCategoryOption,
  ExpenseVendorOption,
} from "../api/expensesTypes";

/**
 * Form values used by the ExpenseFormPanel component.
 *
 * This stays close to the create payload shape so the page layer does not
 * need a large translation step before submitting mutations.
 */
export interface ExpenseFormValues {
  description: string;
  amount: string;
  expense_date: string;
  notes: string;
  category_id: number | null;
  vendor_id: number | null;
}

/**
 * Props for the ExpenseFormPanel component.
 */
interface ExpenseFormPanelProps {
  mode: "create" | "edit";
  initialValues?: Partial<ExpenseFormValues>;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmit: (values: CreateExpensePayload) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * Returns a stable empty form state.
 *
 * @returns Empty expense form values.
 */
function getEmptyFormValues(): ExpenseFormValues {
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
 * Builds the initial form state from optional incoming values.
 *
 * @param initialValues Partial incoming form values.
 * @returns Fully normalized form state object.
 */
function buildInitialFormState(
  initialValues?: Partial<ExpenseFormValues>,
): ExpenseFormValues {
  // # Step 1: Start from the known empty state.
  const emptyState = getEmptyFormValues();

  // # Step 2: Overlay any provided values in a normalized way.
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
 * ExpenseFormPanel
 *
 * Presentational form component for creating and editing expense records.
 *
 * Responsibilities:
 * - manage local form field state
 * - render category/vendor lookup selects
 * - validate basic required fields before submission
 * - emit a payload shaped for the write API layer
 *
 * Non-responsibilities:
 * - data fetching
 * - mutation ownership
 * - route transitions
 * - global toast/notification orchestration
 *
 * @param props Component props.
 * @returns Expense form panel UI.
 */
export default function ExpenseFormPanel({
  mode,
  initialValues,
  categories,
  vendors,
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onCancel,
}: ExpenseFormPanelProps) {
  const [formValues, setFormValues] = useState<ExpenseFormValues>(
    buildInitialFormState(initialValues),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Derived title for the form panel.
   */
  const panelTitle = useMemo(() => {
    return mode === "create" ? "Add Expense" : "Edit Expense";
  }, [mode]);

  /**
   * Derived helper text for the form panel header.
   */
  const panelDescription = useMemo(() => {
    return mode === "create"
      ? "Create a new expense record for the portfolio."
      : "Update the selected expense record.";
  }, [mode]);

  /**
   * Resets the form whenever the parent switches create/edit targets.
   */
  useEffect(() => {
    // # Step 1: Rebuild local state from new incoming values.
    setFormValues(buildInitialFormState(initialValues));

    // # Step 2: Clear stale validation errors when the record changes.
    setValidationError(null);
  }, [initialValues]);

  /**
   * Updates a single form field in local state.
   *
   * @param field Target field name.
   * @param value New field value.
   */
  const updateField = useCallback(
    <K extends keyof ExpenseFormValues>(field: K, value: ExpenseFormValues[K]) => {
      // # Step 1: Update the target field immutably.
      setFormValues((previousState) => ({
        ...previousState,
        [field]: value,
      }));

      // # Step 2: Clear validation once the user starts correcting input.
      setValidationError(null);
    },
    [],
  );

  /**
   * Validates the current form state before submit.
   *
   * @returns Validation error message or null when valid.
   */
  const validateForm = useCallback((values: ExpenseFormValues): string | null => {
    // # Step 1: Enforce required description.
    if (!values.description.trim()) {
      return "Description is required.";
    }

    // # Step 2: Enforce required amount.
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

    // # Step 4: Enforce required expense date.
    if (!values.expense_date.trim()) {
      return "Expense date is required.";
    }

    return null;
  }, []);

  /**
   * Converts local form state into the API payload shape.
   *
   * @param values Current local form values.
   * @returns Create/update payload for the expense write API.
   */
  const buildSubmitPayload = useCallback(
    (values: ExpenseFormValues): CreateExpensePayload => {
      return {
        description: values.description.trim(),
        amount: values.amount.trim(),
        expense_date: values.expense_date,
        notes: values.notes.trim() || undefined,
        category_id: values.category_id,
        vendor_id: values.vendor_id,
      };
    },
    [],
  );

  /**
   * Handles form submission.
   *
   * @param event Form submit event.
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // # Step 1: Validate current form values.
      const errorMessage = validateForm(formValues);

      if (errorMessage) {
        setValidationError(errorMessage);
        return;
      }

      // # Step 2: Build the API-ready payload.
      const payload = buildSubmitPayload(formValues);

      // # Step 3: Delegate the mutation to the page layer.
      await onSubmit(payload);
    },
    [buildSubmitPayload, formValues, onSubmit, validateForm],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{panelTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{panelDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
        {(validationError || submitError) ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {validationError ?? submitError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              htmlFor="expense-description"
              className="text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <input
              id="expense-description"
              type="text"
              value={formValues.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Ex: Plumbing repair, utility bill, landscaping"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-amount"
              className="text-sm font-medium text-slate-700"
            >
              Amount
            </label>
            <input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formValues.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              placeholder="0.00"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-date"
              className="text-sm font-medium text-slate-700"
            >
              Expense Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={formValues.expense_date}
              onChange={(event) =>
                updateField("expense_date", event.target.value)
              }
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-category"
              className="text-sm font-medium text-slate-700"
            >
              Category
            </label>
            <select
              id="expense-category"
              value={formValues.category_id ?? ""}
              onChange={(event) =>
                updateField(
                  "category_id",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-vendor"
              className="text-sm font-medium text-slate-700"
            >
              Vendor
            </label>
            <select
              id="expense-vendor"
              value={formValues.vendor_id ?? ""}
              onChange={(event) =>
                updateField(
                  "vendor_id",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select a vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              htmlFor="expense-notes"
              className="text-sm font-medium text-slate-700"
            >
              Notes
            </label>
            <textarea
              id="expense-notes"
              rows={4}
              value={formValues.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional internal notes for this expense"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Expense"
                : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}