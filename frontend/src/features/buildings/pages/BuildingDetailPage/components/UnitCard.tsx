// # Filename: src/features/buildings/pages/BuildingDetailPage/components/UnitCard.tsx


type UnitCardUnit = {
  id: number;
  label: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
};

type Props = {
  unit: UnitCardUnit;
  isOccupied: boolean;
  leasesLoading: boolean;
  onOpen: (unit: UnitCardUnit) => void;
};

/**
 * UnitCard
 *
 * Presentational component for a single Unit row/card in BuildingDetailPage.
 *
 * Responsibilities:
 * - Render unit label and basic facts (beds/baths/sqft).
 * - Render occupancy chip using the caller-provided `isOccupied`.
 * - Provide a single "Manage leases →" action via `onOpen(unit)`.
 *
 * Non-responsibilities:
 * - Does NOT fetch data (no queries).
 * - Does NOT compute occupancy (caller does).
 * - Does NOT read router/org context (caller does).
 */
export default function UnitCard({
  unit,
  isOccupied,
  leasesLoading,
  onOpen,
}: Props) {
  // Step 1: Create display helpers (keep UI resilient)
  const unitLabel = unit.label?.trim() ? unit.label.trim() : `#${unit.id}`;

  const beds =
    unit.bedrooms === null ? "—" : `${unit.bedrooms} bd`;

  const baths =
    unit.bathrooms === null ? "—" : `${unit.bathrooms} ba`;

  const sqft =
    unit.sqft === null ? "—" : `${unit.sqft.toLocaleString()} sqft`;

  // Step 2: Handle click (single responsibility)
  const handleOpen = () => {
    onOpen(unit);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-white">{unitLabel}</div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isOccupied
                  ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
                  : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
              }`}
              title={leasesLoading ? "Checking occupancy…" : undefined}
            >
              {leasesLoading ? "Checking…" : isOccupied ? "Occupied" : "Vacant"}
            </span>

            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
              {beds}
            </span>

            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
              {baths}
            </span>

            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
              {sqft}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="text-sm text-neutral-200 hover:text-white"
          >
            Manage leases →
          </button>
        </div>
      </div>
    </div>
  );
}