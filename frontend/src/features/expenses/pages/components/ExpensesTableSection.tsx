// # Filename: src/features/expenses/pages/components/ExpensesTableSection.tsx



import ExpensesTable from "../../components/ExpensesTable";
import type { EntityId, ExpenseListItem } from "../../api/expensesTypes";

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
  processingExpenseId?: EntityId | null;

  /**
   * Optional pagination props.
   *
   * These are intentionally optional so we can land the UI shell now
   * and wire real pagination from page state/data in the next step.
   */
  totalExpenseCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
}

const SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const SECTION_INNER_CLASS = "flex flex-col gap-4";
const HEADER_CLASS =
  "flex flex-col gap-3 border-b border-neutral-800 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between";

const TITLE_WRAP_CLASS = "flex min-w-0 flex-col gap-1";
const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";
const TITLE_CLASS = "text-xl font-semibold tracking-tight text-white";
const DESCRIPTION_CLASS = "text-sm text-neutral-400";

const COUNT_BADGE_CLASS =
  "inline-flex w-fit items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300";

const WARNING_BANNER_CLASS =
  "mx-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:mx-5";

const LOADING_SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const ERROR_SHELL_CLASS =
  "rounded-3xl border border-red-500/20 bg-red-500/10 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const FOOTER_CLASS =
  "flex flex-col gap-3 border-t border-neutral-800 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between";

const FOOTER_TEXT_CLASS = "text-sm text-neutral-400";

const PAGINATION_GROUP_CLASS = "flex items-center gap-2";
const PAGINATION_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

const PAGE_BADGE_CLASS =
  "inline-flex items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-neutral-300";

/**
 * Builds a human-readable visible record range for the pagination footer.
 *
 * @param page Current page number.
 * @param pageSize Current page size.
 * @param totalExpenseCount Total number of matching expense records.
 * @param visibleRowCount Number of rows currently rendered on this page.
 * @returns Visible range summary string.
 */
function getVisibleRangeLabel(
  page: number,
  pageSize: number,
  totalExpenseCount: number,
  visibleRowCount: number,
): string {
  // # Step 1: Guard against empty datasets.
  if (totalExpenseCount === 0 || visibleRowCount === 0) {
    return "Showing 0 expenses";
  }

  // # Step 2: Compute the first and last visible row index.
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + visibleRowCount - 1, totalExpenseCount);

  // # Step 3: Return a concise human-readable label.
  return `Showing ${start}-${end} of ${totalExpenseCount} expenses`;
}

/**
 * Returns the best available count label for the records header badge.
 *
 * @param totalExpenseCount Total number of matching expense records, if known.
 * @param visibleRowCount Currently visible row count.
 * @returns Compact count label.
 */
function getCountBadgeLabel(
  totalExpenseCount: number | undefined,
  visibleRowCount: number,
): string {
  const count = totalExpenseCount ?? visibleRowCount;
  return `${count} ${count === 1 ? "expense" : "expenses"}`;
}

/**
 * Page-level wrapper around the expense records table.
 *
 * Responsibilities:
 * - provide the records workspace shell
 * - handle loading and error states
 * - render page-level lookup warnings
 * - expose a pagination footer when page data is available
 * - keep actual row rendering delegated to `ExpensesTable`
 *
 * Important note:
 * This file owns the section shell and pagination container.
 * Column reduction and row-level visual simplification belong in
 * `ExpensesTable.tsx`, which should be patched next.
 *
 * @param props Section props for the expense records area.
 * @returns Expense records section UI.
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
  processingExpenseId = null,
  totalExpenseCount,
  page,
  pageSize,
  totalPages,
  onPreviousPage,
  onNextPage,
}: ExpensesTableSectionProps) {
  // # Step 1: Render loading state in the new dark shell.
  if (isLoading) {
    return (
      <section className={LOADING_SHELL_CLASS}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className={EYEBROW_CLASS}>Records workspace</p>
            <h2 className={TITLE_CLASS}>Expense records</h2>
            <p className={DESCRIPTION_CLASS}>Loading expenses...</p>
          </div>

          <div className="grid gap-3">
            <div className="h-14 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70" />
            <div className="h-14 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70" />
            <div className="h-14 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/70" />
          </div>
        </div>
      </section>
    );
  }

  // # Step 2: Render error state in the new dark shell.
  if (listErrorMessage) {
    return (
      <section className={ERROR_SHELL_CLASS}>
        <div className="flex flex-col gap-1">
          <p className={EYEBROW_CLASS}>Records workspace</p>
          <h2 className="text-xl font-semibold tracking-tight text-red-100">
            Expense records
          </h2>
          <p className="text-sm text-red-200">{listErrorMessage}</p>
        </div>
      </section>
    );
  }

  const canRenderPagination =
    typeof page === "number" &&
    typeof pageSize === "number" &&
    typeof totalPages === "number" &&
    typeof totalExpenseCount === "number" &&
    totalPages > 0 &&
    typeof onPreviousPage === "function" &&
    typeof onNextPage === "function";

  return (
    <section className={SHELL_CLASS}>
      <div className={SECTION_INNER_CLASS}>
        <div className={HEADER_CLASS}>
          <div className={TITLE_WRAP_CLASS}>
            <p className={EYEBROW_CLASS}>Records workspace</p>
            <h2 className={TITLE_CLASS}>Expense records</h2>
            <p className={DESCRIPTION_CLASS}>
              Review, edit, archive, and restore expense records.
            </p>
          </div>

          <div className={COUNT_BADGE_CLASS}>
            {getCountBadgeLabel(totalExpenseCount, expenses.length)}
          </div>
        </div>

        {showLookupWarning ? (
          <div className={WARNING_BANNER_CLASS}>
            Some lookup data could not be loaded. Expense records are still
            available, but category or vendor labels may be incomplete.
          </div>
        ) : null}

        <ExpensesTable
          expenses={expenses}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          isArchiving={isArchiving}
          isUnarchiving={isUnarchiving}
          processingExpenseId={processingExpenseId}
        />

        {canRenderPagination ? (
          <div className={FOOTER_CLASS}>
            <p className={FOOTER_TEXT_CLASS}>
              {getVisibleRangeLabel(
                page,
                pageSize,
                totalExpenseCount,
                expenses.length,
              )}
            </p>

            <div className={PAGINATION_GROUP_CLASS}>
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={page <= 1}
                className={PAGINATION_BUTTON_CLASS}
              >
                Previous
              </button>

              <div className={PAGE_BADGE_CLASS}>
                Page {page} of {totalPages}
              </div>

              <button
                type="button"
                onClick={onNextPage}
                disabled={page >= totalPages}
                className={PAGINATION_BUTTON_CLASS}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}