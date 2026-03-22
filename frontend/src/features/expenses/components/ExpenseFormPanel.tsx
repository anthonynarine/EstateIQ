// # Filename: src/features/expenses/components/ExpenseFormPanel.tsx

import type {
  CreateExpensePayload,
  ExpenseCategoryOption,
  ExpenseVendorOption,
  UpdateExpensePayload,
} from "../api/expensesTypes";
import ExpenseFormActions from "./expense-form/ExpenseFormActions";
import ExpenseFormFields from "./expense-form/ExpenseFormFields";
import type { ExpenseFormValues } from "./expense-form/expenseFormTypes";
import { useExpenseForm } from "./expense-form/useExpenseForm";

type ExpenseFormSubmitPayload =
  | CreateExpensePayload
  | UpdateExpensePayload;

interface ExpenseFormPanelProps {
  mode: "create" | "edit";
  initialValues?: Partial<ExpenseFormValues>;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmit: (values: ExpenseFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * Renders the reusable expense form panel for both create and edit flows.
 *
 * Responsibilities:
 * - render the panel shell and form layout
 * - connect UI fields/actions to the local form hook
 * - display validation and submit errors
 * - stay presentation-focused while the page layer owns orchestration
 *
 * Design note:
 * This component does not try to synchronize incoming `initialValues`
 * after mount. The parent page should remount this component with a
 * stable mode/id-based `key` when switching edit targets so the form
 * hook gets a fresh initialization path.
 *
 * @param props Component props for create/edit expense form rendering.
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
  const {
    formValues,
    validationError,
    panelTitle,
    panelDescription,
    updateField,
    handleSubmit,
  } = useExpenseForm({
    mode,
    initialValues,
    onSubmit,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{panelTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{panelDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
        {validationError || submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {validationError ?? submitError}
          </div>
        ) : null}

        <ExpenseFormFields
          formValues={formValues}
          categories={categories}
          vendors={vendors}
          updateField={updateField}
        />

        <ExpenseFormActions
          mode={mode}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}