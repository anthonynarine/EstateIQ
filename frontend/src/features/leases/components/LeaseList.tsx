// # Filename: src/features/leases/components/LeaseList.tsx


import LeaseCard from "./LeaseCard/LeaseCard";

type Props = {
  leases: any[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  orgSlug: string;
  unitId: number;
  emptyMessage?: string;
};

export default function LeaseList({
  leases,
  isLoading,
  isFetching,
  error,
  orgSlug,
  unitId,
  emptyMessage = "No leases found.",
}: Props) {
  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
        Loading leases…
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-300">
        Failed to load leases.
      </div>
    );
  }

  // Empty state
  if (!leases || leases.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leases.map((lease) => (
        <LeaseCard
          key={lease.id}
          lease={lease}
          orgSlug={orgSlug}
          unitId={unitId}
        />
      ))}

      {isFetching && (
        <p className="text-xs text-neutral-500">
          Refreshing lease data…
        </p>
      )}
    </div>
  );
}