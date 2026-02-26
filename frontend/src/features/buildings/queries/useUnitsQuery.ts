
// # Filename: src/features/buildings/queries/useUnitsQuery.ts

import { useQuery } from "@tanstack/react-query";
import { listUnitsByBuilding, type Unit } from "../api/unitsApi";

/**
 * UseUnitsQueryArgs
 *
 * Args for fetching Units scoped to a specific Building within an Org.
 *
 * Notes:
 * - orgSlug is part of the query key to prevent cross-tenant cache bleed.
 * - buildingId is part of the query key to isolate units per building.
 * - enabled allows the caller (page) to hard-block execution until all
 *   prerequisites exist (orgSlug + buildingId).
 */
type UseUnitsQueryArgs = {
  orgSlug: string | null;
  buildingId: number | null;
  enabled?: boolean;
};

/**
 * unitsQueryKey
 *
 * Canonical query key for Units under a Building.
 *
 * Shape:
 *   ["org", orgSlug, "units", buildingId]
 *
 * Why:
 * - "org" prefix ensures all multi-tenant data keys start consistently
 * - orgSlug isolates tenant cache
 * - buildingId isolates resource cache
 */
export function unitsQueryKey(orgSlug: string, buildingId: number) {
  return ["org", orgSlug, "units", buildingId] as const;
}

/**
 * useUnitsQuery
 *
 * Fetches Units under a specific Building.
 *
 * Data flow:
 * - OrgProvider sets canonical orgSlug (URL ?org=<slug>)
 * - tokenStorage persists orgSlug for axios header injection
 * - axios attaches:
 *    Authorization: Bearer <token>
 *    X-Org-Slug: <orgSlug>
 * - backend resolves request.org and filters accordingly
 *
 * Returns:
 * - TanStack Query result whose `data` is Unit[] (normalized in unitsApi).
 */
export function useUnitsQuery({ orgSlug, buildingId, enabled }: UseUnitsQueryArgs) {
  // Step 1: Block until prerequisites exist
  const canFetch = Boolean(enabled ?? true) && Boolean(orgSlug) && Boolean(buildingId);

  return useQuery<Unit[], Error>({
    // Step 2: Query key must include org + building boundary
    queryKey: canFetch
      ? unitsQueryKey(orgSlug as string, buildingId as number)
      : (["org", orgSlug ?? "missing-org", "units", buildingId ?? "missing-building"] as const),

    // Step 3: Query function
    queryFn: async () => {
      // Guard: should never run if canFetch is false, but keep deterministic safety.
      if (!orgSlug || !buildingId) return [];
      return listUnitsByBuilding(buildingId);
    },

    // Step 4: Actual execution gate
    enabled: canFetch,

    // Step 5: Reasonable freshness for CRUD lists
    staleTime: 10_000,
    gcTime: 5 * 60_000,

    // Step 6: UX improvements
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      // Don’t hammer on auth/permission issues; let UI handle
      const msg = String((err as any)?.message ?? "");
      if (msg.includes("403") || msg.includes("401")) return false;
      return failureCount < 2;
    },
  });
}