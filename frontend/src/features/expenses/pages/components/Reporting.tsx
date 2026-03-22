// # Filename: src/features/expenses/pages/components/ExpensesFormSection.tsx

// ✅ New Code

import ExpenseFormPanel from "../../components/ExpenseFormPanel";
import type { ExpenseFormValues } from "../../components/expense-form/expenseFormTypes";
import type {
  CreateExpensePayload,
  ExpenseCategoryOption,
  ExpenseVendorOption,
  UpdateExpensePayload,
} from "../../api/expensesTypes";

type ExpenseFormSubmitPayload =
  | CreateExpensePayload
  | UpdateExpensePayload;

const SECTION_CONTAINER_CLASS = "flex flex-col gap-4";
const SECTION_PANEL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";
const SECTION_INNER_CLASS = "p-5 sm:p-6";
const SECTION_EYEBROW_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500";
const SECTION_TITLE_CLASS =
  "mt-2 text-xl font-semibold tracking-tight text-white";
const SECTION_DESCRIPTION_CLASS = "mt-2 text-sm text-neutral-400";
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
  isSubmitting: boolean;
  isLoadingDetail: boolean;
  submitError: string | null;
  onSubmit: (values: ExpenseFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * Returns true when the edit form has enough initial data to mount safely.
 *
 * Why this matters:
 * The underlying form hook initializes local state from `initialValues`
 * once on mount. If we mount the form before the selected expense detail
 * is loaded, the form can lock in empty values and appear broken until the
 * user clicks the same record again after the query is cached.
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
      initialValues.vendor_id !== undefined,
  );
}

/**
 * Returns the section heading text based on the current form mode.
 *
 * @param mode Current form mode.
 * @returns Section title string.
 */
function getSectionTitle(mode: "create" | "edit"): string {
  return mode === "edit" ? "Edit expense" : "Add expense";
}

/**
 * Returns the section helper text based on the current form mode.
 *
 * @param mode Current form mode.
 * @returns Section description string.
 */
function getSectionDescription(mode: "create" | "edit"): string {
  return mode === "edit"
    ? "Update the selected expense and save changes back into the current organization workspace."
    : "Create an expense record for the current organization workspace. Start simple and enrich category, vendor, or property linkage later.";
}

/**
 * Page-level wrapper around the reusable expense form panel.
 *
 * Responsibilities:
 * - bridge page orchestration props into the form panel
 * - surface edit-detail loading state cleanly
 * - provide a parent-controlled remount key for safe create/edit switching
 * - align the section shell with the PortfolioOS / EstateIQ dark UI system
 *
 * Important behavior:
 * In edit mode, the panel is not mounted until the selected expense detail
 * is ready. This prevents stale or empty form initialization on first edit.
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
  isSubmitting,
  isLoadingDetail,
  submitError,
  onSubmit,
  onCancel,
}: ExpensesFormSectionProps) {
  const shouldWaitForEditData =
    mode === "edit" && (isLoadingDetail || !hasEditInitialValues(initialValues));

  return (
    <section className={SECTION_CONTAINER_CLASS}>
      <div className={SECTION_PANEL_CLASS}>
        <div className={SECTION_INNER_CLASS}>
          <p className={SECTION_EYEBROW_CLASS}>Expense workspace</p>
          <h2 className={SECTION_TITLE_CLASS}>{getSectionTitle(mode)}</h2>
          <p className={SECTION_DESCRIPTION_CLASS}>
            {getSectionDescription(mode)}
          </p>

          <div className="mt-5">
            {shouldWaitForEditData ? (
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
            ) : (
              <ExpenseFormPanel
                key={formKey}
                mode={mode}
                initialValues={initialValues}
                categories={categories}
                vendors={vendors}
                isSubmitting={isSubmitting || isLoadingDetail}
                submitError={submitError}
                onSubmit={onSubmit}
                onCancel={mode === "edit" ? onCancel : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}