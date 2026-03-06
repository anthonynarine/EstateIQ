// # Filename: src/features/leases/components/LeaseHistorySection.tsx


import LeaseList from "./LeaseList";
import type { Lease } from "../api/leaseApi";

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
 * LeaseHistorySection
 *
 * Thin semantic wrapper around LeaseList for historical leases.
 */
export default function LeaseHistorySection({
  leases,
  isLoading,
  isFetching,
  error,
  orgSlug,
  unitId,
  title = "Lease history",
  emptyMessage = "No lease history yet.",
}: Props) {
  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Historical record
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Previous leases associated with this unit.
            </p>
          </div>

          {!isLoading && leases.length > 0 ? (
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {leases.length} {leases.length === 1 ? "lease" : "leases"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <LeaseList
          leases={leases}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          orgSlug={orgSlug}
          unitId={unitId}
          title=""
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}