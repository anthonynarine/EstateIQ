// # Filename: src/components/pagination/CollectionPaginationFooter.tsx

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  isFetching?: boolean;
  itemLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
};

/**
 * getRangeLabel
 *
 * Computes the visible item range for the current page.
 */
function getRangeLabel(page: number, pageSize: number, totalCount: number) {
  if (totalCount <= 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return { start, end };
}

/**
 * pluralize
 *
 * Returns a simple pluralized label for the item summary text.
 */
function pluralize(label: string, totalCount: number) {
  return totalCount === 1 ? label : `${label}s`;
}

/**
 * CollectionPaginationFooter
 *
 * Shared, section-level pagination footer for operational collection views.
 *
 * Responsibilities:
 * - Render current range summary
 * - Render previous/next controls
 * - Render compact page indicator
 * - Preserve EstateIQ premium dark UI language
 *
 * Non-responsibilities:
 * - Fetching data
 * - Managing URL state
 * - Calculating page from router params
 */
export default function CollectionPaginationFooter({
  page,
  pageSize,
  totalCount,
  isFetching = false,
  itemLabel,
  onPrevious,
  onNext,
  className = "",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const { start, end } = getRangeLabel(page, pageSize, totalCount);

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const buttonBaseClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  const enabledButtonClass =
    "border-white/10 bg-white/5 text-white hover:bg-white/10";
  const disabledButtonClass =
    "cursor-not-allowed border-white/5 bg-white/[0.03] text-neutral-500";

  return (
    <div
      className={[
        "border-t border-white/10 px-5 py-4 sm:px-6",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Step 1: Summary */}
        <div className="min-w-0">
          <p className="text-sm text-neutral-400">
            Showing{" "}
            <span className="font-medium text-white">{start}</span>
            {"–"}
            <span className="font-medium text-white">{end}</span> of{" "}
            <span className="font-medium text-white">{totalCount}</span>{" "}
            {pluralize(itemLabel, totalCount)}
            {isFetching ? (
              <span className="ml-2 text-neutral-500">• Refreshing…</span>
            ) : null}
          </p>
        </div>

        {/* Step 2: Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPreviousPage}
            className={[
              buttonBaseClass,
              hasPreviousPage ? enabledButtonClass : disabledButtonClass,
            ].join(" ")}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div
            className="
              inline-flex min-h-10 items-center justify-center rounded-full
              border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200
            "
          >
            Page <span className="mx-1 text-white">{page}</span> of{" "}
            <span className="ml-1 text-white">{totalPages}</span>
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNextPage}
            className={[
              buttonBaseClass,
              hasNextPage ? enabledButtonClass : disabledButtonClass,
            ].join(" ")}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}