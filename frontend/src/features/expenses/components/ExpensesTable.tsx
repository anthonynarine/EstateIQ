// # Filename: src/features/expenses/components/ExpensesTable.tsx
// ✅ New Code

import ExpenseStatusBadge from "./ExpenseStatusBadge";
import type { EntityId, ExpenseListItem } from "../api/expensesTypes";

interface ExpensesTableProps {
  expenses: ExpenseListItem[];
  onEdit: (expense: ExpenseListItem) => void;
  onArchive: (expense: ExpenseListItem) => Promise<void> | void;
  onUnarchive: (expense: ExpenseListItem) => Promise<void> | void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
  processingExpenseId?: EntityId | null;
}

const TABLE_HEAD_CELL_CLASS =
  "px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500";

const TABLE_BODY_ROW_CLASS =
  "border-b border-neutral-800/80 transition hover:bg-neutral-900/40 last:border-b-0";

const TABLE_CELL_CLASS = "px-5 py-3 align-middle";

const ACTION_BUTTON_BASE_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const EDIT_BUTTON_CLASS =
  "border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]";

const ARCHIVE_BUTTON_CLASS =
  "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15";

const RESTORE_BUTTON_CLASS =
  "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15";

/**
 * Formats a raw expense amount into USD currency.
 *
 * @param value Raw amount from the expense record.
 * @returns Formatted USD display string.
 */
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

/**
 * Formats an ISO-like date string into a stable date-only value.
 *
 * @param value Raw expense date string from the API.
 * @returns Date-only display string or em dash fallback.
 */
function formatExpenseDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value.slice(0, 10);
}

/**
 * Returns the best available primary label for an expense row.
 *
 * @param expense Expense record.
 * @returns Row title for display.
 */
function getExpensePrimaryLabel(expense: ExpenseListItem): string {
  return expense.title?.trim() || expense.description?.trim() || "Untitled expense";
}

/**
 * Returns compact secondary metadata for the row.
 *
 * @param expense Expense record.
 * @returns Secondary metadata string or null.
 */
function getExpenseSecondaryMeta(expense: ExpenseListItem): string | null {
  const parts: string[] = [];

  if (expense.category?.name) {
    parts.push(expense.category.name);
  }

  if (expense.vendor?.name) {
    parts.push(expense.vendor.name);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function ExpensesTable({
  expenses,
  onEdit,
  onArchive,
  onUnarchive,
  isArchiving = false,
  isUnarchiving = false,
  processingExpenseId = null,
}: ExpensesTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-6 text-center">
          <p className="text-sm font-medium text-neutral-200">
            No expenses match the current filters.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Try clearing a filter or adjusting your search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="grid gap-3 px-4 pb-4 md:hidden sm:px-5 sm:pb-5">
        {expenses.map((expense) => {
          const isRowProcessing = processingExpenseId === expense.id;
          const disableArchiveButton =
            isArchiving && isRowProcessing && !expense.is_archived;
          const disableRestoreButton =
            isUnarchiving && isRowProcessing && Boolean(expense.is_archived);
          const disableEditButton = isRowProcessing;

          const primaryLabel = getExpensePrimaryLabel(expense);
          const secondaryMeta = getExpenseSecondaryMeta(expense);

          return (
            <article
              key={expense.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-white">
                    {primaryLabel}
                  </h3>

                  {secondaryMeta ? (
                    <p className="text-xs text-neutral-500">{secondaryMeta}</p>
                  ) : null}

                  {expense.notes ? (
                    <p className="text-xs text-neutral-400">{expense.notes}</p>
                  ) : null}
                </div>

                {expense.is_archived ? (
                  <ExpenseStatusBadge isArchived />
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Date
                  </span>
                  <span className="text-sm text-neutral-200">
                    {formatExpenseDate(expense.expense_date)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Amount
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  disabled={disableEditButton}
                  className={`${ACTION_BUTTON_BASE_CLASS} ${EDIT_BUTTON_CLASS}`}
                >
                  Edit
                </button>

                {expense.is_archived ? (
                  <button
                    type="button"
                    onClick={() => onUnarchive(expense)}
                    disabled={disableRestoreButton}
                    className={`${ACTION_BUTTON_BASE_CLASS} ${RESTORE_BUTTON_CLASS}`}
                  >
                    {disableRestoreButton ? "Restoring..." : "Restore"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onArchive(expense)}
                    disabled={disableArchiveButton}
                    className={`${ACTION_BUTTON_BASE_CLASS} ${ARCHIVE_BUTTON_CLASS}`}
                  >
                    {disableArchiveButton ? "Archiving..." : "Archive"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full">
          <thead className="border-b border-neutral-800 bg-neutral-950/80">
            <tr>
              <th className={TABLE_HEAD_CELL_CLASS}>Description</th>
              <th className={TABLE_HEAD_CELL_CLASS}>Date</th>
              <th className={`${TABLE_HEAD_CELL_CLASS} text-right`}>Amount</th>
              <th className={`${TABLE_HEAD_CELL_CLASS} text-right`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => {
              const isRowProcessing = processingExpenseId === expense.id;
              const disableArchiveButton =
                isArchiving && isRowProcessing && !expense.is_archived;
              const disableRestoreButton =
                isUnarchiving && isRowProcessing && Boolean(expense.is_archived);
              const disableEditButton = isRowProcessing;

              const primaryLabel = getExpensePrimaryLabel(expense);
              const secondaryMeta = getExpenseSecondaryMeta(expense);

              return (
                <tr key={expense.id} className={TABLE_BODY_ROW_CLASS}>
                  <td className={TABLE_CELL_CLASS}>
                    <div className="flex max-w-[34rem] flex-col gap-0.5">
                      <span
                        className={
                          expense.is_archived
                            ? "text-sm font-medium text-neutral-300"
                            : "text-sm font-medium text-white"
                        }
                      >
                        {primaryLabel}
                      </span>

                      {secondaryMeta ? (
                        <span className="text-xs text-neutral-500">
                          {secondaryMeta}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className={`${TABLE_CELL_CLASS} text-sm text-neutral-300`}>
                    {formatExpenseDate(expense.expense_date)}
                  </td>

                  <td
                    className={`${TABLE_CELL_CLASS} text-right text-sm font-semibold text-white`}
                  >
                    {formatCurrency(expense.amount)}
                  </td>

                  <td className={TABLE_CELL_CLASS}>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        disabled={disableEditButton}
                        className={`${ACTION_BUTTON_BASE_CLASS} ${EDIT_BUTTON_CLASS}`}
                      >
                        Edit
                      </button>

                      {expense.is_archived ? (
                        <button
                          type="button"
                          onClick={() => onUnarchive(expense)}
                          disabled={disableRestoreButton}
                          className={`${ACTION_BUTTON_BASE_CLASS} ${RESTORE_BUTTON_CLASS}`}
                        >
                          {disableRestoreButton ? "Restoring..." : "Restore"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onArchive(expense)}
                          disabled={disableArchiveButton}
                          className={`${ACTION_BUTTON_BASE_CLASS} ${ARCHIVE_BUTTON_CLASS}`}
                        >
                          {disableArchiveButton ? "Archiving..." : "Archive"}
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
    </>
  );
}