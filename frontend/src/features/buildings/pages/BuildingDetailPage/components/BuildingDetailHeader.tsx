// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingDetailHeader.tsx


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
 * Presentational header for BuildingDetailPage.
 *
 * Responsibilities:
 * - Render building name and formatted address.
 * - Render occupancy summary chips (occupied/vacant + total).
 * - Keep UI stable while the page is loading (optional `isLoading`).
 *
 * Non-responsibilities:
 * - Does NOT fetch data.
 * - Does NOT compute occupancy (caller provides counts).
 * - Does NOT perform navigation (caller owns routing).
 */
export default function BuildingDetailHeader({
  orgSlug,
  building,
  occupiedUnitsCount,
  totalUnitsCount,
  isLoading = false,
}: Props) {
  // Step 1: Derive computed display values (UI-safe)
  const vacantUnitsCount = Math.max(totalUnitsCount - occupiedUnitsCount, 0);

  const line2 = building.address_line2?.trim() ? `, ${building.address_line2.trim()}` : "";
  const address = `${building.address_line1}${line2}`;
  const cityStateZip = `${building.city}, ${building.state} ${building.postal_code}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">
            {isLoading ? "Loading building…" : building.name}
          </h1>

          <div className="text-sm text-neutral-300">
            <div>{address}</div>
            <div>{cityStateZip}</div>
          </div>

          <div className="text-xs text-neutral-500">Org: {orgSlug}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
            Units: {totalUnitsCount}
          </span>

          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">
            Occupied: {occupiedUnitsCount}
          </span>

          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300 ring-1 ring-rose-400/20">
            Vacant: {vacantUnitsCount}
          </span>
        </div>
      </div>
    </div>
  );
}