// # Filename: src/features/buildings/pages/BuildingDetailPage.tsx


import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";

import { useOrg } from "../../tenancy/hooks/useOrg";
import CreateUnitForm from "../components/CreateUnitForm";
import { useUnitsQuery } from "../queries/useUnitsQuery";
import { useBuildingQuery } from "../queries/useBuildings"; 

import type { Building } from "../api/buildingsApi";

import { listLeasesByUnit } from "../../leases/api/leaseApi";
import { leasesByUnitQueryKey } from "../../leases/queries/useLeasesByUnitQuery";
import { getTodayISO, getUnitOccupancyStatus } from "../../leases/utils/occupancy";

/**
 * BuildingDetailPage
 *
 * Module E (Units under Building):
 * - Resolve buildingId from route
 * - Confirm orgSlug exists (canonical from OrgProvider)
 * - Render CreateUnitForm scoped to building
 * - Render Units list via TanStack Query (org-scoped key)
 *
 * Module G (Occupancy on Building View):
 * - Shows Occupied/Vacant per unit by querying leases per unit (useQueries)
 * - Occupancy rule is deterministic (active + date range)
 *
 * NOTE:
 * - This uses 1 + N requests (units + leases per unit).
 * - Fine for demo/small portfolios.
 * - Later we should optimize with a backend aggregated endpoint to avoid N+1.
 */
export default function BuildingDetailPage() {
  // Step 0: Navigation helpers
  const navigate = useNavigate();
  const location = useLocation();

  // Step 0b: Optional building snapshot from navigation state (for instant header rendering)
  const buildingSnapshot = (location.state as { building?: Building } | null)
    ?.building;

  // Step 1: Read buildingId from route
  const { buildingId } = useParams<{ buildingId: string }>();

  // Step 2: Get canonical orgSlug
  const { orgSlug } = useOrg();

  // Step 3: Parse + validate buildingId
  const buildingIdNumber = useMemo(() => {
    if (!buildingId) return null;
    const n = Number(buildingId);
    return Number.isFinite(n) ? n : null;
  }, [buildingId]);

  // Step 4: Determine whether queries/actions are allowed (no conditional hooks)
  const canQuery = Boolean(orgSlug) && Boolean(buildingIdNumber);

  // Step 4b: Deep-link safe building fetch (ONLY when snapshot is missing)
  const {
    data: buildingFetched,
    isLoading: isBuildingLoading,
    error: buildingError,
  } = useBuildingQuery(
    orgSlug ?? null,
    buildingIdNumber ?? null,
    canQuery && !buildingSnapshot, // ✅ only fetch if we don't already have snapshot
  );

  // Step 4c: Single source for header rendering
  const buildingForHeader = buildingSnapshot ?? buildingFetched;

  // Step 5: Units query (ALWAYS call hook; use enabled gate)
  const {
    data: units = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useUnitsQuery({
    orgSlug: orgSlug ?? "",
    buildingId: buildingIdNumber ?? 0,
    enabled: canQuery,
  });

  // Step 6: Date used for deterministic occupancy checks (stable per mount)
  const todayISO = useMemo(() => getTodayISO(), []);

  // Step 7: Leases queries per unit (N queries, but hook is called once)
  const leasesResults = useQueries({
    queries: units.map((u) => ({
      queryKey: leasesByUnitQueryKey(orgSlug ?? "", u.id),
      queryFn: async () => await listLeasesByUnit(u.id),
      enabled: canQuery && units.length > 0,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  // Step 8: Map unitId -> occupancy status
  const occupancyByUnitId = useMemo(() => {
    const map = new Map<number, "occupied" | "vacant">();

    units.forEach((u, idx) => {
      const leases = leasesResults[idx]?.data ?? [];
      const status = getUnitOccupancyStatus(leases, todayISO);
      map.set(u.id, status);
    });

    return map;
  }, [leasesResults, todayISO, units]);

  // Step 9: Helper formatting (fixes 1.00/2.00 UI)
  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(n);
  };

  const formatBeds = (value: number | null | undefined) => {
    const v = formatNumber(value);
    return v ? `${v} bd` : null;
  };

  const formatBaths = (value: number | null | undefined) => {
    const v = formatNumber(value);
    return v ? `${v} ba` : null;
  };

  const formatSqft = (value: number | null | undefined) => {
    if (value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;

    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(n)} sqft`;
  };

  // Step 10: Unit navigation (preserve ?org=...)
  const goToUnit = (unitId: number) => {
    if (!Number.isFinite(unitId)) return;
    const search = location.search || "";
    navigate(`/dashboard/units/${unitId}${search}`);
  };

  // Step 11: Safe early returns (hooks already called)
  if (!orgSlug) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Organization not selected. Add ?org=&lt;slug&gt; to URL.
        </div>
      </div>
    );
  }

  if (!buildingIdNumber) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Invalid building ID.
        </div>
      </div>
    );
  }

  // Step 12: Occupancy summary counts (nice dashboard signal)
  const occupiedCount = units.reduce((acc, u) => {
    return occupancyByUnitId.get(u.id) === "occupied" ? acc + 1 : acc;
  }, 0);
  const vacantCount = units.length - occupiedCount;

  // Step 13: Shared Chip (matches BuildingCard style; no ":" in labels)
  const Chip = ({
    label,
    value,
    variant = "neutral",
  }: {
    label: string;
    value?: number | string;
    variant?: "neutral" | "occupied" | "vacant";
  }) => {
    const base =
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border";

    const styles: Record<typeof variant, string> = {
      neutral: "border-white/10 bg-white/5 text-white/80",
      occupied: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
      vacant: "border-red-400/25 bg-red-500/10 text-red-200",
    };

    return (
      <span className={`${base} ${styles[variant]}`}>
        <span>{label}</span>
        {value !== undefined ? (
          <span className="ml-2 text-white">{value}</span>
        ) : null}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">
                {buildingForHeader?.name ?? "Building"}
              </h1>

              {/* Step 12a: Prefer address; fall back while loading */}
              {buildingForHeader ? (
                <div className="space-y-0.5">
                  <p className="text-sm text-neutral-400">
                    {buildingForHeader.address_line1}
                    {buildingForHeader.address_line2
                      ? `, ${buildingForHeader.address_line2}`
                      : ""}
                  </p>

                  <p className="text-sm text-neutral-500">
                    {buildingForHeader.city}, {buildingForHeader.state}{" "}
                    {buildingForHeader.postal_code}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  {isBuildingLoading
                    ? "Loading building…"
                    : `Building ID #${buildingIdNumber}`}
                </p>
              )}

              {buildingError ? (
                <p className="text-xs text-red-300">
                  Failed to load building details.
                  <span className="ml-2 text-red-200/80">
                    {buildingError instanceof Error
                      ? buildingError.message
                      : "Unknown error"}
                  </span>
                </p>
              ) : null}

              <p className="text-xs text-neutral-500">
                Occupancy computed from active leases on {todayISO}.
              </p>
            </div>

            {/* Step 12b: Summary chips (same style as BuildingCard) */}
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Chip label="Units" value={units.length} variant="neutral" />
              <Chip label="Occupied" value={occupiedCount} variant="occupied" />
              <Chip label="Vacant" value={vacantCount} variant="vacant" />
            </div>
          </div>
        </div>

        {/* Create Unit */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <CreateUnitForm buildingId={buildingIdNumber} />
        </div>

        {/* Units List */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Units</h2>
              <p className="mt-1 text-xs text-neutral-400">
                Click a unit to manage leases. Occupancy is computed from leases.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>

          {/* Error */}
          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
              Failed to load units.
              <div className="mt-2 text-xs text-red-200/80">
                {error instanceof Error ? error.message : "Unknown error"}
              </div>
            </div>
          ) : null}

          {/* Loading */}
          {isLoading ? (
            <div className="text-sm text-neutral-400">Loading units…</div>
          ) : null}

          {/* Empty */}
          {!isLoading && !error && units.length === 0 ? (
            <div className="text-sm text-neutral-400">
              No units yet. Create one above.
            </div>
          ) : null}

          {/* List */}
          {!isLoading && !error && units.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {units.map((u, idx) => {
                const occ = occupancyByUnitId.get(u.id) ?? "vacant";
                const leasesLoading = leasesResults[idx]?.isLoading;

                const beds = formatBeds(u.bedrooms);
                const baths = formatBaths(u.bathrooms);
                const sqft = formatSqft(u.sqft);

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => goToUnit(u.id)}
                    className="text-left rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-700 hover:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                    title="Open unit details"
                  >
                    <div className="min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-white">
                          {u.label || `Unit #${u.id}`}
                        </div>

                        {leasesLoading ? (
                          <span className="text-[11px] text-neutral-400">
                            Checking…
                          </span>
                        ) : null}
                      </div>

                      {/* Step 14: Unit pills (same visual language as BuildingCard) */}
                      <div className="flex flex-wrap gap-2">
                        <Chip
                          label={occ === "occupied" ? "Occupied" : "Vacant"}
                          variant={occ === "occupied" ? "occupied" : "vacant"}
                        />
                        {beds ? <Chip label={beds} variant="neutral" /> : null}
                        {baths ? <Chip label={baths} variant="neutral" /> : null}
                        {sqft ? <Chip label={sqft} variant="neutral" /> : null}
                      </div>

                      <div className="text-[11px] text-neutral-500">
                        Manage leases →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}