// # Filename: src/features/expenses/pages/components/ExpensesTableSection.tsx
// ✅ New Code

import ExpensesTable from "../../components/ExpensesTable";
import type { EntityId, ExpenseListItem } from "../../api/expensesTypes";
import ExpensesTablePaginationFooter from "../../components/ExpensesTablePaginationFooter";

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
  totalExpenseCount?: number;
  page?: number;
  pageSize?: number;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  isListFetching?: boolean;
}

const SHELL_CLASS =
  "flex h-full flex-col rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const SECTION_INNER_CLASS = "flex flex-1 flex-col gap-2";

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
  onPreviousPage,
  onNextPage,
  isListFetching = false,
}: ExpensesTableSectionProps) {
  if (isLoading) {
    return (
      <section className={LOADING_SHELL_CLASS}>
        <div className="flex flex-col gap-3">
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
    typeof totalExpenseCount === "number" &&
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ExpensesTable
              expenses={expenses}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              isArchiving={isArchiving}
              isUnarchiving={isUnarchiving}
              processingExpenseId={processingExpenseId}
            />
          </div>

          {canRenderPagination ? (
            <ExpensesTablePaginationFooter
              page={page}
              pageSize={pageSize}
              totalCount={totalExpenseCount}
              itemLabel="expense"
              isFetching={isListFetching}
              onPrevious={onPreviousPage}
              onNext={onNextPage}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}