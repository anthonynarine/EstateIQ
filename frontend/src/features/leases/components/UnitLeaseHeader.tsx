// # Filename: src/features/leases/components/UnitLeaseHeader.tsx
// ✅ New Code

import PageBackLink from "../../utils/PageBackLink";

type Props = {
  buildingName: string;
  unitLabel: string;
  backToUnitsHref: string | null;
  occupancyText: string;
  occupancyClassName: string;
  unitLeaseCount: number;
  isLoadingLeaseCount: boolean;
  isRefreshing: boolean;
  orgSlug: string;
};

/**
 * UnitLeaseHeader
 *
 * Premium workspace header for the unit lease page.
 *
 * Responsibilities:
 * - Show deterministic "Back to Units" navigation
 * - Show building + unit identity
 * - Show occupancy / lease-count status pills
 * - Keep the header presentational only
 */
export default function UnitLeaseHeader({
  buildingName,
  unitLabel,
  backToUnitsHref,
  occupancyText,
  occupancyClassName,
  unitLeaseCount,
  isLoadingLeaseCount,
  isRefreshing,
  orgSlug,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div>
            {backToUnitsHref ? (
              <PageBackLink to={backToUnitsHref} label="Back to Units" />
            ) : null}
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium tracking-wide text-neutral-400">
                  {buildingName}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                    Unit {unitLabel}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${occupancyClassName}`}
                      title="Computed from lease status and date range"
                    >
                      {occupancyText}
                    </span>

                    {!isLoadingLeaseCount ? (
                      <span
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300"
                        title="Count of leases attached to this unit"
                      >
                        Unit leases: {unitLeaseCount}
                      </span>
                    ) : (
                      <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                        Counting leases…
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-neutral-500">Org: {orgSlug}</p>
            </div>

            <div className="flex items-center justify-start lg:justify-end">
              {isRefreshing ? (
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                  Refreshing…
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}