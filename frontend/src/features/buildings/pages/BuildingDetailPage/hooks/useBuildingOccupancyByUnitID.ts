// # Filename: src/features/buildings/pages/BuildingDetailPage/hooks/useBuildingOccupancyByUnitId.ts


import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

type UnitLike = {
  id: number;
};

type UnitOccupancyResponse = {
  active_lease?: {
    id: number;
  } | null;
};

type FetchUnitOccupancyArgs = {
  orgSlug: string;
  unitId: number;
  asOfDateISO: string;
};

type FetchUnitOccupancy = (
  args: FetchUnitOccupancyArgs
) => Promise<UnitOccupancyResponse>;

type LeaseQueryResult = {
  unitId: number;
  isLoading: boolean;
  isError: boolean;
  data?: UnitOccupancyResponse;
};

type Props = {
  orgSlug: string;
  units: UnitLike[];
  /**
   * Optional override for occupancy fetcher.
   * If omitted, you must replace `defaultFetchUnitOccupancy` implementation below.
   */
  fetchUnitOccupancy?: FetchUnitOccupancy;
};

/**
 * useBuildingOccupancyByUnitId
 *
 * Composition hook for BuildingDetailPage:
 * - Runs a per-unit occupancy query using TanStack `useQueries`.
 * - Produces a stable `occupancyByUnitId` map to support UI rendering.
 *
 * Data contract assumption:
 * - Occupancy endpoint returns `{ active_lease: { id } | null }`
 *   OR something similar that can be used to determine "occupied vs vacant".
 *
 * Non-responsibilities:
 * - Does NOT render UI.
 * - Does NOT know about routing params (caller supplies orgSlug, units).
 */
export function useBuildingOccupancyByUnitId({
  orgSlug,
  units,
  fetchUnitOccupancy,
}: Props) {
  // Step 1: Resolve an "as-of" date once per render (stable)
  const todayISO = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  // Step 2: Provide a default fetcher placeholder (must be replaced if not injected)
  const defaultFetchUnitOccupancy: FetchUnitOccupancy = async () => {
    throw new Error(
      "fetchUnitOccupancy not provided. Pass it in or implement defaultFetchUnitOccupancy in the hook."
    );
  };

  const fetcher = fetchUnitOccupancy ?? defaultFetchUnitOccupancy;

  // Step 3: Build per-unit queries
  const queryResults = useQueries({
    queries: units.map((u) => ({
      queryKey: ["unit", orgSlug, u.id, "occupancy", todayISO],
      queryFn: async () =>
        fetcher({
          orgSlug,
          unitId: u.id,
          asOfDateISO: todayISO,
        }),
      enabled: Boolean(orgSlug) && Number.isFinite(u.id),
      staleTime: 30_000,
    })),
  });

  // Step 4: Normalize results into a predictable structure
  const leasesResults: LeaseQueryResult[] = useMemo(() => {
    return units.map((u, idx) => {
      const r = queryResults[idx];
      return {
        unitId: u.id,
        isLoading: r.isLoading,
        isError: r.isError,
        data: r.data as UnitOccupancyResponse | undefined,
      };
    });
  }, [queryResults, units]);

  // Step 5: Produce occupancy map: { [unitId]: boolean }
  const occupancyByUnitId = useMemo(() => {
    const map: Record<number, boolean> = {};

    leasesResults.forEach((r) => {
      const activeLeaseId = r.data?.active_lease?.id ?? null;
      map[r.unitId] = Boolean(activeLeaseId);
    });

    return map;
  }, [leasesResults]);

  return {
    todayISO,
    leasesResults,
    occupancyByUnitId,
  };
}

export default useBuildingOccupancyByUnitId;