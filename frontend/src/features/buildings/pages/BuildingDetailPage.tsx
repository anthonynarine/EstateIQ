// # Filename: src/features/buildings/pages/BuildingDetailPage.tsx

import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query"; 

import { useOrg } from "../../tenancy/hooks/useOrg";
import CreateUnitForm from "../components/CreateUnitForm";
import { useUnitsQuery } from "../queries/useUnitsQuery";


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

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">
                Building #{buildingIdNumber}
              </h1>
              <p className="text-sm text-neutral-400">Org: {orgSlug}</p>
              <p className="text-xs text-neutral-500">
                Occupancy computed from active leases on {todayISO}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                Units: {isLoading ? "…" : units.length}
              </span>

              {!isLoading ? (
                <>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    Occupied: {occupiedCount}
                  </span>
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                    Vacant: {vacantCount}
                  </span>
                </>
              ) : null}

              {(isFetching || isLoading) && (
                <span className="text-xs text-neutral-400">Updating…</span>
              )}
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
                const details =
                  [
                    formatBeds(u.bedrooms),
                    formatBaths(u.bathrooms),
                    formatSqft(u.sqft),
                  ]
                    .filter(Boolean)
                    .join(" • ") || "No details yet";

                const occ = occupancyByUnitId.get(u.id) ?? "vacant";
                const occBadge =
                  occ === "occupied"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200";

                const leasesLoading = leasesResults[idx]?.isLoading;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => goToUnit(u.id)}
                    className="text-left rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-700 hover:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                    title="Open unit details"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-white">
                          {u.label || `Unit #${u.id}`}
                        </div>

                        <div className="flex items-center gap-2">
                          {leasesLoading ? (
                            <span className="text-[11px] text-neutral-400">
                              Checking…
                            </span>
                          ) : null}

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${occBadge}`}
                            title="Computed from active lease + date range"
                          >
                            {occ}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-400">{details}</div>

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