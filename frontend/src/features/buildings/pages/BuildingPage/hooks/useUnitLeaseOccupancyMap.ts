// # Filename: src/features/buildings/pages/BuildingDetailPage/hooks/useUnitLeaseOccupancyMap.ts


import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type { Lease } from "../../../../leases/api/leaseApi";
import { listLeasesByUnit } from "../../../../leases/api/leaseApi";
import { getTodayISO, getUnitOccupancyStatus } from "../../../../leases/utils/occupancy";

type UnitLike = { id: number };

type Props = {
  orgSlug: string;
  units: UnitLike[];
  enabled?: boolean;
};

type LeaseResult = {
  unitId: number;
  isLoading: boolean;
  isError: boolean;
  leases: Lease[];
};

/**
 * useUnitLeaseOccupancyMap
 *
 * BuildingDetailPage occupancy source of truth:
 * - Fetches leases per unit using TanStack `useQueries` (shared cache keys).
 * - Computes occupancy deterministically using `occupancy.ts`:
 *   active + in date range => Occupied
 *
 * Why this exists:
 * - Avoids the broken `fetchUnitOccupancy not provided` hook.
 * - Keeps occupancy aligned with the Unit detail page (same leases data).
 *
 * Tradeoff:
 * - N+1 calls (one per unit). Acceptable for 1–50 units.
 * - Later optimization: add backend `is_occupied` on Unit serializer or a bulk endpoint.
 */
export function useUnitLeaseOccupancyMap({ orgSlug, units, enabled = true }: Props) {
  const todayISO = useMemo(() => getTodayISO(), []);

  const canRun = enabled && Boolean(orgSlug) && units.length > 0;

  // Step 1: Query leases for each unit using the SAME cache key shape as useLeasesByUnitQuery
  const results = useQueries({
    queries: (canRun ? units : []).map((u) => ({
      queryKey: ["org", orgSlug, "leases", "unit", u.id] as const,
      queryFn: async () => {
        const leases = await listLeasesByUnit(u.id);
        return Array.isArray(leases) ? leases : [];
      },
      staleTime: 15_000,
      enabled: canRun && Number.isFinite(u.id),
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  // Step 2: Normalize results into a predictable shape
  const leaseResults: LeaseResult[] = useMemo(() => {
    return (canRun ? units : []).map((u, idx) => {
      const r = results[idx];
      const leases = (r?.data ?? []) as Lease[];

      return {
        unitId: u.id,
        isLoading: Boolean(r?.isLoading),
        isError: Boolean(r?.isError),
        leases: Array.isArray(leases) ? leases : [],
      };
    });
  }, [canRun, results, units]);

  // Step 3: Build maps for UI use
  const loadingByUnitId = useMemo(() => {
    const map: Record<number, boolean> = {};
    leaseResults.forEach((r) => {
      map[r.unitId] = r.isLoading;
    });
    return map;
  }, [leaseResults]);

  const occupancyByUnitId = useMemo(() => {
    const map: Record<number, boolean> = {};
    leaseResults.forEach((r) => {
      const status = getUnitOccupancyStatus(r.leases, todayISO);
      map[r.unitId] = status === "occupied";
    });
    return map;
  }, [leaseResults, todayISO]);

  return { todayISO, leaseResults, loadingByUnitId, occupancyByUnitId };
}