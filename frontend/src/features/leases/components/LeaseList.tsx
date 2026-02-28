// # Filename: src/features/units/components/LeaseList.tsx
import type { Lease } from "../../leases/api/leaseApi";
import LeaseCard from "../../leases/components/LeaseCard";

type Props = {
  leases: Lease[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  orgSlug: string;
  unitId: number;
  title?: string;
  emptyMessage?: string;
};

/**
 * LeasesList
 *
 * Presentational list component for rendering leases for a unit.
 *
 * Enterprise behaviors:
 * - Handles loading / fetching / error / empty states consistently.
 * - Sorts leases so ACTIVE appears first, then DRAFT, then ENDED.
 * - Keeps output deterministic and stable.
 */
export default function LeasesList({
  leases,
  isLoading,
  isFetching,
  error,
  orgSlug,
  unitId,
  title = "Leases",
  emptyMessage = "No leases yet.",
}: Props) {
  // Step 1: Normalize error message for display
  const errorMessage = (() => {
    const msg =
      (error as any)?.response?.data?.detail || (error as any)?.message || null;

    return typeof msg === "string" ? msg : "Failed to load leases.";
  })();

  // Step 2: Sort leases (active first, then draft, then ended; newest start_date first)
  const sorted = [...(leases ?? [])].sort((a, b) => {
    const statusRank = (s: Lease["status"]) =>
      s === "active" ? 0 : s === "draft" ? 1 : 2;

    const r1 = statusRank(a.status);
    const r2 = statusRank(b.status);
    if (r1 !== r2) return r1 - r2;

    const aTime = a.start_date ? Date.parse(a.start_date) : 0;
    const bTime = b.start_date ? Date.parse(b.start_date) : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>

        <div className="flex items-center gap-2">
          {isLoading ? <span className="text-xs text-neutral-400">Loading…</span> : null}
          {!isLoading && isFetching ? (
            <span className="text-xs text-neutral-400">Updating…</span>
          ) : null}
          {!isLoading && !isFetching ? (
            <span className="text-xs text-neutral-500">{sorted.length} total</span>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {/* Loading */}
      {isLoading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          Loading leases…
        </div>
      ) : null}

      {/* Empty */}
      {!isLoading && !error && sorted.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          {emptyMessage}
        </div>
      ) : null}

      {/* List */}
      {!isLoading && !error && sorted.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {sorted.map((lease) => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              orgSlug={orgSlug}
              unitId={unitId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}