// # Filename: src/features/leases/components/LeaseCard/LeaseRepairBanner.tsx

/**
 * LeaseRepairBanner
 *
 * Presentational warning banner for legacy-invalid leases that
 * are missing an authoritative primary tenant relationship.
 */
export default function LeaseRepairBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
      <p className="text-sm font-medium text-amber-200">Lease repair needed</p>
      <p className="mt-1 text-xs text-amber-200/80">
        Terms-only edits are blocked until a primary tenant is restored.
      </p>
    </div>
  );
}