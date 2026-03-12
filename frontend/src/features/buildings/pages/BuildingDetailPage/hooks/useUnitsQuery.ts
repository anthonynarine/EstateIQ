// # Filename: src/features/buildings/queries/useUnitsQuery.ts

import { useQuery } from "@tanstack/react-query";
import {
  listUnitsByBuilding,
  type Unit,
  type PaginatedResponse,
} from "../../../api/unitsApi";

/**
 * UseUnitsQueryArgs
 *
 * Args for fetching paginated Units scoped to a specific Building.
 */
type UseUnitsQueryArgs = {
  orgSlug: string | null;
  buildingId: number | null;
  page: number;
  pageSize: number;
  enabled?: boolean;
};

/**
 * unitsQueryKey
 *
 * Canonical query key for Units under a Building.
 *
 * Shape:
 *   ["org", orgSlug, "units", buildingId, { page, pageSize }]
 */
export function unitsQueryKey(
  orgSlug: string | null,
  buildingId: number | null,
  page: number,
  pageSize: number,
) {
  return ["org", orgSlug, "units", buildingId, { page, pageSize }] as const;
}

/**
 * useUnitsQuery
 *
 * Fetch paginated Units for a Building.
 */
export function useUnitsQuery({
  orgSlug,
  buildingId,
  page,
  pageSize,
  enabled,
}: UseUnitsQueryArgs) {
  // Step 1: Determine whether the query is allowed to run
  const canFetch =
    Boolean(enabled ?? true) && Boolean(orgSlug) && Boolean(buildingId);

  return useQuery<PaginatedResponse<Unit>, Error>({
    // Step 2: Use a clean nullable key instead of fake sentinel values
    queryKey: unitsQueryKey(orgSlug, buildingId, page, pageSize),

    queryFn: async () => {
      // Step 3: Defensive fallback for disabled / incomplete context
      if (!orgSlug || !buildingId) {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        };
      }

      // Step 4: Fetch building-scoped units
      return listUnitsByBuilding({
        buildingId,
        page,
        pageSize,
      });
    },

    enabled: canFetch,

    // Step 5: Keep previous page visible while next page loads
    placeholderData: (previous) => previous,

    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,

    retry: (failureCount, err) => {
      // Step 6: Do not retry auth / permission failures
      const msg = String((err as { message?: string })?.message ?? "");
      if (msg.includes("403") || msg.includes("401")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}