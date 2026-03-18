// # Filename: src/features/expenses/pages/components/ExpensesTableSection.tsx


import ExpensesTable from "../../components/ExpensesTable";
import type { ExpenseListItem } from "../../api/expensesTypes";

/**
 * Props for the ExpensesTableSection component.
 */
interface ExpensesTableSectionProps {
  expenses: ExpenseListItem[];
  isLoading: boolean;
  listErrorMessage: string | null;
  showLookupWarning: boolean;
  onEdit: (expense: ExpenseListItem) => void;
  onArchive: (expense: ExpenseListItem) => Promise<void> | void;
  onUnarchive: (expense: ExpenseListItem) => Promise<void> | void;
  isArchiving: boolean;
  isUnarchiving: boolean;
}

/**
 * ExpensesTableSection
 *
 * Page-level wrapper around the reusable ExpensesTable.
 *
 * Responsibilities:
 * - surface list loading state
 * - surface list-level error state
 * - surface lookup warning state
 * - delegate row rendering to ExpensesTable
 *
 * @param props Component props.
 * @returns Table section UI.
 */
export default function ExpensesTableSection({
  expenses,
  isLoading,
  listErrorMessage,
  showLookupWarning,
  onEdit,
  onArchive,
  onUnarchive,
  isArchiving,
  isUnarchiving,
}: ExpensesTableSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {listErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {listErrorMessage}
        </div>
      ) : null}

      {showLookupWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
          Lookup data failed to fully load. Expense create/edit may be limited
          until category and vendor queries succeed.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading expenses...</p>
        </div>
      ) : (
        <ExpensesTable
          expenses={expenses}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          isArchiving={isArchiving}
          isUnarchiving={isUnarchiving}
        />
      )}
    </div>
  );
}