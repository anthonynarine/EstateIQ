// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingDetailHeader.tsx
// ✅ New Code

import { Building2 } from "lucide-react";

type BuildingHeaderModel = {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
};

type Props = {
  orgSlug: string;
  building: BuildingHeaderModel;
  occupiedUnitsCount: number;
  totalUnitsCount: number;
  isLoading?: boolean;
};

/**
 * BuildingDetailHeader
 *
 * Premium workspace header for the Building Detail page.
 *
 * Responsibilities:
 * - Render building identity with strong visual hierarchy
 * - Render formatted address
 * - Render occupancy summary chips
 * - Stay purely presentational
 */
export default function BuildingDetailHeader({
  orgSlug: _orgSlug,
  building,
  occupiedUnitsCount,
  totalUnitsCount,
  isLoading = false,
}: Props) {
  // Step 1: Derived counts
  const vacantUnitsCount = Math.max(totalUnitsCount - occupiedUnitsCount, 0);

  // Step 2: UI-safe formatted address
  const addressLine2 = building.address_line2?.trim()
    ? `, ${building.address_line2.trim()}`
    : "";

  const address = `${building.address_line1}${addressLine2}`;
  const cityStateZip = `${building.city}, ${building.state} ${building.postal_code}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 shadow-[0_0_0_1px_rgba(255,255,255,0.015)]">
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Building workspace
                  </p>

                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {isLoading ? "Loading building…" : building.name}
                  </h1>
                </div>

                <div className="space-y-1 text-sm leading-6 text-neutral-400">
                  <p>{address}</p>
                  <p>{cityStateZip}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300">
              Units: {totalUnitsCount}
            </span>

            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              Occupied: {occupiedUnitsCount}
            </span>

            <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300">
              Vacant: {vacantUnitsCount}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}