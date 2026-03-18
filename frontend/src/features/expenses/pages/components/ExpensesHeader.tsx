// # Filename: src/features/expenses/pages/components/ExpensesHeader.tsx

/**
 * Props for the ExpensesHeader component.
 */
interface ExpensesHeaderProps {
  isEditing: boolean;
  onCreateNew: () => void;
}

/**
 * ExpensesHeader
 *
 * Page-level header for the Expenses feature.
 *
 * Responsibilities:
 * - render title/description
 * - expose the "New Expense" action when editing
 *
 * @param props Component props.
 * @returns Page header UI.
 */
export default function ExpensesHeader({
  isEditing,
  onCreateNew,
}: ExpensesHeaderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Manage operational expenses, keep category and vendor context
            attached, and review reporting without mixing aggregate views into
            the record lifecycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={onCreateNew}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              New Expense
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}