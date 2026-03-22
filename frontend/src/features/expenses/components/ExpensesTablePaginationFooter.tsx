// # Filename: src/features/expenses/pages/components/ExpensesTablePaginationFooter.tsx

// ✅ New Code

interface ExpensesTablePaginationFooterProps {
  page: number;
  pageSize: number;
  totalCount: number;
  itemLabel?: string;
  isFetching?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const FOOTER_CLASS =
  "flex flex-col gap-3 border-t border-neutral-800 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between";

const SUMMARY_CLASS = "text-sm text-neutral-400";

const CONTROLS_CLASS = "flex items-center gap-2";

const BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

const PAGE_BADGE_CLASS =
  "inline-flex items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm font-medium text-neutral-300";

/**
 * Builds a human-readable visible range label for the records footer.
 *
 * @param page Current page number.
 * @param pageSize Number of records per page.
 * @param totalCount Total number of matching records.
 * @param itemLabel Singular label for the record type.
 * @returns Range summary string.
 */
function getRangeLabel(
  page: number,
  pageSize: number,
  totalCount: number,
  itemLabel: string,
): string {
  // # Step 1: Handle an empty result set.
  if (totalCount === 0) {
    return `Showing 0 ${itemLabel}s`;
  }

  // # Step 2: Compute visible range.
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // # Step 3: Return readable summary text.
  return `Showing ${start}-${end} of ${totalCount} ${itemLabel}${
    totalCount === 1 ? "" : "s"
  }`;
}

/**
 * Local pagination footer for the Expenses records workspace.
 *
 * This footer is intentionally page-specific so the Expenses slice can keep a
 * calmer visual language without forcing those styles onto shared pagination
 * components used elsewhere in the app.
 *
 * @param props Pagination footer props.
 * @returns Pagination footer UI for the expenses records table.
 */
export default function ExpensesTablePaginationFooter({
  page,
  pageSize,
  totalCount,
  itemLabel = "expense",
  isFetching = false,
  onPrevious,
  onNext,
}: ExpensesTablePaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext = page < totalPages && !isFetching;

  return (
    <div className={FOOTER_CLASS}>
      <p className={SUMMARY_CLASS}>
        {getRangeLabel(page, pageSize, totalCount, itemLabel)}
      </p>

      <div className={CONTROLS_CLASS}>
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={BUTTON_CLASS}
        >
          Previous
        </button>

        <div className={PAGE_BADGE_CLASS}>
          Page {page} of {totalPages}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={BUTTON_CLASS}
        >
          Next
        </button>
      </div>
    </div>
  );
}