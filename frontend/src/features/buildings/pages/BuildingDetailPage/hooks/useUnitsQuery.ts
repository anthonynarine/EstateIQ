// # Filename: src/features/buildings/queries/useUnitsQuery.ts
// ✅ Updated for paginated Units API

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
 *   ["org", orgSlug, "units", buildingId, {page, pageSize}]
 */
export function unitsQueryKey(
  orgSlug: string,
  buildingId: number,
  page: number,
  pageSize: number
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
  const canFetch =
    Boolean(enabled ?? true) && Boolean(orgSlug) && Boolean(buildingId);

  return useQuery<PaginatedResponse<Unit>, Error>({
    queryKey: canFetch
      ? unitsQueryKey(orgSlug as string, buildingId as number, page, pageSize)
      : ([
          "org",
          orgSlug ?? "missing-org",
          "units",
          buildingId ?? "missing-building",
          { page, pageSize },
        ] as const),

    queryFn: async () => {
      if (!orgSlug || !buildingId) {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        };
      }

      return listUnitsByBuilding({
        buildingId,
        page,
        pageSize,
      });
    },

    enabled: canFetch,

    // Keeps previous page visible while next loads
    placeholderData: (previous) => previous,

    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,

    retry: (failureCount, err) => {
      const msg = String((err as any)?.message ?? "");
      if (msg.includes("403") || msg.includes("401")) return false;
      return failureCount < 2;
    },
  });
}