// ✅ New Code
// # Filename: src/features/tenants/components/directory/TenantPagination.tsx

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  isDisabled?: boolean;
};

/**
 * TenantPagination
 *
 * Compact, mobile-first pagination control for the tenant directory.
 *
 * Responsibilities:
 * - Show current page position.
 * - Expose previous/next navigation.
 * - Stay compact and touch-friendly on small screens.
 *
 * Important:
 * - This component is presentational only.
 * - It does not own URL state or query state.
 */
export default function TenantPagination({
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  isDisabled = false,
}: Props) {
  const previousDisabled = isDisabled || !hasPreviousPage;
  const nextDisabled = isDisabled || !hasNextPage;

  return (
    <div className="-mx-5 flex items-center justify-between gap-3 border-t border-white/10 px-5 pt-4 sm:-mx-6 sm:px-6">
      {/* Step 1: Previous button */}
      <button
        type="button"
        onClick={onPreviousPage}
        disabled={previousDisabled}
        className="
          inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
          border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium
          text-neutral-200 transition
          hover:bg-white/10
          focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Step 2: Page indicator */}
      <div className="min-w-0 text-center">
        <p className="text-sm font-medium text-white">
          Page {currentPage} of {totalPages}
        </p>
        <p className="text-xs text-neutral-500">
          Browse tenant directory results
        </p>
      </div>

      {/* Step 3: Next button */}
      <button
        type="button"
        onClick={onNextPage}
        disabled={nextDisabled}
        className="
          inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
          border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium
          text-neutral-200 transition
          hover:bg-white/10
          focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
