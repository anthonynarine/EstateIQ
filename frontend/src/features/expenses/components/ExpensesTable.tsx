// # Filename: src/features/expenses/components/ExpensesTable.tsx

import ExpenseStatusBadge from "./ExpenseStatusBadge";
import type { ExpenseListItem } from "../api/expensesTypes";

/**
 * Props for the ExpensesTable component.
 */
interface ExpensesTableProps {
  expenses: ExpenseListItem[];
  onEdit: (expense: ExpenseListItem) => void;
  onArchive: (expense: ExpenseListItem) => void;
  onUnarchive: (expense: ExpenseListItem) => void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
}

/**
 * Safely formats money-like API values for table display.
 *
 * The backend may serialize Decimal values as either strings or numbers.
 *
 * @param amount Raw API money value.
 * @returns User-friendly currency string.
 */
function formatCurrency(amount: string | number | null | undefined): string {
  // # Step 1: Normalize missing values.
  if (amount === null || amount === undefined || amount === "") {
    return "$0.00";
  }

  // # Step 2: Convert to a number safely.
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  // # Step 3: Guard against malformed backend values.
  if (Number.isNaN(numericAmount)) {
    return "$0.00";
  }

  // # Step 4: Format as USD currency.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount);
}

/**
 * Safely formats ISO-like date strings for table display.
 *
 * @param value Raw date string from the API.
 * @returns User-friendly formatted date.
 */
function formatDate(value: string | null | undefined): string {
  // # Step 1: Guard against missing values.
  if (!value) {
    return "—";
  }

  // # Step 2: Parse the incoming value.
  const parsedDate = new Date(value);

  // # Step 3: Guard against invalid date parsing.
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // # Step 4: Return a readable localized date.
  return parsedDate.toLocaleDateString();
}

/**
 * Builds a readable location label for an expense row.
 *
 * This helps the table show operational context without the page needing
 * to stitch together building/unit/lease text inline.
 *
 * @param expense Expense row item.
 * @returns Human-readable location label.
 */
function getLocationLabel(expense: ExpenseListItem): string {
  // # Step 1: Read available association names.
  const buildingName = expense.building?.name;
  const unitNumber = expense.unit?.unit_number;

  // # Step 2: Return the richest available label.
  if (buildingName && unitNumber) {
    return `${buildingName} • Unit ${unitNumber}`;
  }

  if (buildingName) {
    return buildingName;
  }

  if (unitNumber) {
    return `Unit ${unitNumber}`;
  }

  return "—";
}

/**
 * ExpensesTable
 *
 * Presentational table for rendering expense records.
 *
 * Responsibilities:
 * - display core expense fields
 * - expose edit/archive/unarchive row actions
 * - surface archive state clearly
 *
 * Non-responsibilities:
 * - data fetching
 * - mutation execution
 * - routing
 * - filter state
 *
 * @param props Component props.
 * @returns Rendered expense table or empty state.
 */
export default function ExpensesTable({
  expenses,
  onEdit,
  onArchive,
  onUnarchive,
  isArchiving = false,
  isUnarchiving = false,
}: ExpensesTableProps) {
  // # Step 1: Render a clean empty state when no rows exist.
  if (!expenses.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-600">
            No expenses found for the current view.
          </p>
        </div>
      </div>
    );
  }

  // # Step 2: Render the table when rows are available.
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
        <p className="mt-1 text-sm text-slate-600">
          View, edit, and manage expense records across the portfolio.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
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
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {expenses.map((expense) => {
              const isArchived = Boolean(expense.is_archived);

              return (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                    {formatDate(expense.expense_date)}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{expense.description}</span>
                      {expense.notes ? (
                        <span className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {expense.notes}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                    {expense.category?.name ?? "—"}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                    {expense.vendor?.name ?? "—"}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                    {getLocationLabel(expense)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <ExpenseStatusBadge expense={expense} />
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(expense.amount)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>

                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => onUnarchive(expense)}
                          disabled={isUnarchiving}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Unarchive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onArchive(expense)}
                          disabled={isArchiving}
                          className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}