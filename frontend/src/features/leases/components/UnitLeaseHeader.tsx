// # Filename: src/features/leases/components/UnitLeaseHeader.tsx

import { Building2, Home, RefreshCw } from "lucide-react";
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
 * Layout goals:
 * - Mobile-first
 * - Top utility row:
 *   - left: back button
 *   - right: metadata pills
 * - Bottom identity row:
 *   - icon chip
 *   - building name
 *   - unit title
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
    <section
      className="
        overflow-hidden rounded-3xl border border-white/10
        bg-gradient-to-b from-neutral-900/90 to-neutral-950/90
        shadow-[0_0_0_1px_rgba(255,255,255,0.02)]
      "
    >
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center">
              {backToUnitsHref ? (
                <PageBackLink to={backToUnitsHref} label="Back to Units" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${occupancyClassName}`}
                title="Computed from lease status and date range"
              >
                {occupancyText}
              </span>

              {!isLoadingLeaseCount ? (
                <span
                  className="
                    inline-flex items-center rounded-full border
                    border-white/10 bg-white/[0.03]
                    px-3 py-1 text-xs font-medium text-neutral-300
                  "
                  title="Count of leases attached to this unit"
                >
                  Unit leases: {unitLeaseCount}
                </span>
              ) : (
                <span
                  className="
                    inline-flex items-center rounded-full border
                    border-white/10 bg-white/[0.03]
                    px-3 py-1 text-xs text-neutral-400
                  "
                >
                  Counting leases…
                </span>
              )}

              <span
                className="
                  inline-flex items-center rounded-full border
                  border-white/10 bg-white/[0.03]
                  px-3 py-1 text-xs text-neutral-400
                "
              >
                Org: {orgSlug}
              </span>

              {isRefreshing ? (
                <span
                  className="
                    inline-flex items-center gap-2 rounded-full border
                    border-white/10 bg-white/[0.03]
                    px-3 py-1 text-xs text-neutral-400
                  "
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Refreshing…
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className="
                inline-flex h-11 w-11 shrink-0 items-center justify-center
                rounded-2xl border border-cyan-400/20 bg-cyan-500/10
                text-cyan-200 sm:h-12 sm:w-12
              "
            >
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center gap-2">
                <Home className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                <p className="truncate text-sm font-medium tracking-wide text-neutral-400">
                  {buildingName}
                </p>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem] lg:text-[2.2rem]">
                Unit {unitLabel}
              </h1>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}