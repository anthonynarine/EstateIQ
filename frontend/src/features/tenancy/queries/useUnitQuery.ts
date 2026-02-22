// # Filename: src/features/tenancy/queries/useUnitsQuery.ts
// ✅ New Code

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listUnits } from "../../../api/unitsApi";
import type { Unit } from "../types";

export type UnitsQueryParams = {
  orgSlug: string;
  page: number;
  pageSize: number;
  ordering?: string;
  building?: number;
  search?: string;
};

export type UnitsQueryResult = {
  results: Unit[];
  count: number;
  next: string | null;
  previous: string | null;
};

/**
 * useUnitsQuery
 *
 * Server-state for units list (scoped by orgSlug).
 * Normalizes DRF paginated response to a strict shape.
 */
export function useUnitsQuery(params: UnitsQueryParams) {
  const { orgSlug, page, pageSize, ordering, building, search } = params;

  return useQuery<UnitsQueryResult>({
    // Step 1: Cache boundary includes orgSlug (multi-tenant safety)
    queryKey: ["units", orgSlug, page, pageSize, ordering ?? "", building ?? "", search ?? ""],

    // Step 2: Fetch
    queryFn: async () => {
      const data = await listUnits({ page, pageSize, ordering, building, search });

      // Step 3: Robust normalization (paginated vs non-paginated)
      const results: Unit[] = data?.results ?? data ?? [];

      return {
        results,
        count: data?.count ?? results.length ?? 0,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
      };
    },

    // Step 4: Only run once orgSlug is ready
    enabled: Boolean(orgSlug),

    // Step 5: Smooth pagination
    placeholderData: keepPreviousData,
  });
}
