// # Filename: src/features/expenses/pages/components/ExpensesFormSection.tsx

import ExpenseFormPanel, {
  type ExpenseFormValues,
} from "../../components/ExpenseFormPanel";
import type {
  CreateExpensePayload,
  ExpenseCategoryOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";

/**
 * Re-exported for mapper usage.
 */
export type { ExpenseFormValues };

/**
 * Props for the ExpensesFormSection component.
 */
interface ExpensesFormSectionProps {
  mode: "create" | "edit";
  initialValues: Partial<ExpenseFormValues>;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  isSubmitting: boolean;
  isLoadingDetail: boolean;
  submitError: string | null;
  onSubmit: (values: CreateExpensePayload) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * ExpensesFormSection
 *
 * Page-level wrapper around the reusable ExpenseFormPanel.
 *
 * Responsibilities:
 * - bridge page orchestration props into the form panel
 * - surface detail-loading state cleanly
 *
 * @param props Component props.
 * @returns Form section UI.
 */
export default function ExpensesFormSection({
  mode,
  initialValues,
  categories,
  vendors,
  isSubmitting,
  isLoadingDetail,
  submitError,
  onSubmit,
  onCancel,
}: ExpensesFormSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {isLoadingDetail && mode === "edit" ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading selected expense details...
        </div>
      ) : null}

      <ExpenseFormPanel
        mode={mode}
        initialValues={initialValues}
        categories={categories}
        vendors={vendors}
        isSubmitting={isSubmitting || isLoadingDetail}
        submitError={submitError}
        onSubmit={onSubmit}
        onCancel={mode === "edit" ? onCancel : undefined}
      />
    </div>
  );
}