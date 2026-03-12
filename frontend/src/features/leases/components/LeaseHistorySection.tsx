// # Filename: src/features/leases/components/LeaseHistorySection.tsx
// ✅ New Code

import { ChevronDown, Clock } from "lucide-react";
import LeaseList from "./LeaseList";
import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";

type LeaseLike = {
  id: number;
  end_date?: string | null;
};

type Props = {
  leases: LeaseLike[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;

  isOpen: boolean;
  onToggle: () => void;

  onPreviousPage: () => void;
  onNextPage: () => void;

  isLoading: boolean;
  isFetching: boolean;
  error: unknown;

  orgSlug: string;
  unitId: number;

  title: string;
  emptyMessage: string;
};

/**
 * formatDatePreview
 *
 * Formats an ISO date into a compact preview label.
 *
 * @param value ISO date string
 * @returns Human-friendly date string or null
 */
function formatDatePreview(value?: string | null): string | null {
  // Step 1: Guard empty input
  if (!value) {
    return null;
  }

  // Step 2: Parse the date safely
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  // Step 3: Return compact display format
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeaseHistorySection({
  leases,
  totalCount,
  page,
  pageSize,
  totalPages,
  isOpen,
  onToggle,
  onPreviousPage,
  onNextPage,
  isLoading,
  isFetching,
  error,
  orgSlug,
  unitId,
  title,
  emptyMessage,
}: Props) {
  const showPagination = totalCount > pageSize;

  const mostRecentEndedDate = formatDatePreview(leases?.[0]?.end_date ?? null);

  const primarySummary =
    totalCount === 0
      ? "No previous leases"
      : `${totalCount} previous lease${totalCount > 1 ? "s" : ""}`;

  const secondarySummary =
    totalCount === 0
      ? "Historical records will appear here once earlier leases exist."
      : mostRecentEndedDate
        ? `Most recent ended: ${mostRecentEndedDate}`
        : "Historical records available for review.";

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="
          w-full
          flex items-center justify-between
          gap-4
          p-5 sm:p-6
          text-left
          hover:bg-neutral-900/40
          transition
        "
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-2 text-neutral-300">
            <Clock className="h-4 w-4" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {title}
            </p>

            <p className="text-lg font-semibold text-white">Lease history</p>

            <p className="text-sm text-neutral-300">{primarySummary}</p>

            <p className="text-xs text-neutral-500">{secondarySummary}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
            {totalCount}
          </span>

          <ChevronDown
            className={`h-5 w-5 text-neutral-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-neutral-800/80 p-5 sm:p-6">
          <LeaseList
            leases={leases}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            orgSlug={orgSlug}
            unitId={unitId}
            emptyMessage={emptyMessage}
          />

          {showPagination && (
            <CollectionPaginationFooter
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              itemLabel="lease"
              isFetching={isFetching}
              onPrevious={onPreviousPage}
              onNext={onNextPage}
            />
          )}
        </div>
      )}
    </section>
  );
}