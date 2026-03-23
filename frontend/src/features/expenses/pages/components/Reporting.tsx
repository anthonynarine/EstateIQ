// # Filename: src/features/expenses/pages/components/Reporting.tsx
// ✅ New Code

import ExpenseFormPanel from "../../components/ExpenseFormPanel";
import type { ExpenseFormValues } from "../../components/expense-form/expenseFormTypes";
import type {
  CreateExpensePayload,
  ExpenseBuildingOption,
  ExpenseCategoryOption,
  ExpenseUnitOption,
  ExpenseVendorOption,
  UpdateExpensePayload,
} from "../../api/expensesTypes";

type ExpenseFormSubmitPayload =
  | CreateExpensePayload
  | UpdateExpensePayload;

const INFO_CARD_CLASS =
  "rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-sm text-neutral-300";

/**
 * Props for the ExpensesFormSection component.
 */
interface ExpensesFormSectionProps {
  formKey: string;
  mode: "create" | "edit";
  initialValues: Partial<ExpenseFormValues>;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  buildingOptions?: ExpenseBuildingOption[];
  unitOptions?: ExpenseUnitOption[];
  isSubmitting: boolean;
  isLoadingDetail: boolean;
  submitError: string | null;
  onSubmit: (values: ExpenseFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * Returns true when the edit form has enough initial data to mount safely.
 *
 * @param initialValues Current form initial values.
 * @returns Whether edit mode has enough data to mount the form.
 */
function hasEditInitialValues(
  initialValues: Partial<ExpenseFormValues>,
): boolean {
  return Boolean(
    initialValues.description ||
      initialValues.amount ||
      initialValues.expense_date ||
      initialValues.notes ||
      initialValues.category_id !== undefined ||
      initialValues.vendor_id !== undefined ||
      initialValues.scope !== undefined ||
      initialValues.building_id !== undefined ||
      initialValues.unit_id !== undefined ||
      initialValues.lease_id !== undefined,
  );
}

/**
 * Page-level wrapper around the reusable expense form panel.
 *
 * Responsibilities:
 * - bridge page orchestration props into the form panel
 * - guard edit mode until detail data is ready
 * - stay visually thin so the panel owns the actual UI shell
 *
 * @param props Component props.
 * @returns Form section UI for the Expenses page.
 */
export default function ExpensesFormSection({
  formKey,
  mode,
  initialValues,
  categories,
  vendors,
  buildingOptions = [],
  unitOptions = [],
  isSubmitting,
  isLoadingDetail,
  submitError,
  onSubmit,
  onCancel,
}: ExpensesFormSectionProps) {
  const shouldWaitForEditData =
    mode === "edit" && (isLoadingDetail || !hasEditInitialValues(initialValues));

  if (shouldWaitForEditData) {
    return (
      <section className="h-full">
        <div className="flex h-full flex-col rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="border-b border-neutral-800/80 px-5 py-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Expense workspace
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Edit expense
              </h2>
              <p className="text-sm text-neutral-400">
                Loading the selected expense so the form can mount safely.
              </p>
            </div>
          </div>

          <div className="flex-1 px-5 py-5">
            <div className="flex flex-col gap-3">
              <div className={INFO_CARD_CLASS}>
                Loading selected expense details...
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-12 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70" />
                <div className="h-12 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70" />
                <div className="h-12 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70 md:col-span-2" />
                <div className="h-28 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70 md:col-span-2" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full">
      <ExpenseFormPanel
        key={formKey}
        mode={mode}
        initialValues={initialValues}
        categories={categories}
        vendors={vendors}
        buildingOptions={buildingOptions}
        unitOptions={unitOptions}
        isSubmitting={isSubmitting || isLoadingDetail}
        submitError={submitError}
        onSubmit={onSubmit}
        onCancel={mode === "edit" ? onCancel : undefined}
      />
    </section>
  );
}