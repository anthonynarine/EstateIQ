// # Filename: src/features/expenses/components/ExpensesTable.tsx

import ExpenseStatusBadge from "./ExpenseStatusBadge";
import type { ExpenseListItem } from "../api/expensesTypes";

interface ExpensesTableProps {
  expenses: ExpenseListItem[];
  onEdit: (expense: ExpenseListItem) => void;
  onArchive: (expense: ExpenseListItem) => Promise<void> | void;
  onUnarchive: (expense: ExpenseListItem) => Promise<void> | void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "$0.00";
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  if (Number.isNaN(numericValue)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericValue);
}

// ✅ New Code
export default function ExpensesTable({
  expenses,
  onEdit,
  onArchive,
  onUnarchive,
  isArchiving = false,
  isUnarchiving = false,
}: ExpensesTableProps) {
  if (expenses.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Expense Records</h2>
        <p className="mt-2 text-sm text-slate-600">
          No expenses match the current filters.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Expense Records</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review, edit, archive, and restore expense records.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-900">
                      {expense.description}
                    </span>
                    {expense.notes ? (
                      <span className="max-w-md text-xs text-slate-500">
                        {expense.notes}
                      </span>
                    ) : null}
                  </div>
                </td>

                <td className="px-6 py-4 align-top text-sm text-slate-700">
                  {expense.category?.name ?? "—"}
                </td>

                <td className="px-6 py-4 align-top text-sm text-slate-700">
                  {expense.vendor?.name ?? "—"}
                </td>

                <td className="px-6 py-4 align-top text-sm text-slate-700">
                  {expense.expense_date ? expense.expense_date.slice(0, 10) : "—"}
                </td>

                <td className="px-6 py-4 align-top text-right text-sm font-medium text-slate-900">
                  {formatCurrency(expense.amount)}
                </td>

                <td className="px-6 py-4 align-top">
                  <ExpenseStatusBadge
                    isArchived={Boolean(expense.is_archived)}
                  />
                </td>

                <td className="px-6 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(expense)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>

                    {expense.is_archived ? (
                      <button
                        type="button"
                        onClick={() => onUnarchive(expense)}
                        disabled={isUnarchiving}
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onArchive(expense)}
                        disabled={isArchiving}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}