// # Filename: src/features/tenancy/queries/useUnitLeasesQuery.ts

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Lease } from "../types";

// If you already created src/api/leasesApi.ts with listUnitLeases(unitId),
// use that import. Otherwise, see the note below.
// import { listUnitLeases } from "../../../api/leasesApi";
import api from "../../../api/axios";

export type UnitLeasesQueryParams = {
  orgSlug: string;
  unitId: number;
};

/**
 * Unit leases query hook (server-state).
 *
 * Why this exists:
 * - Centralizes fetching logic for /api/v1/units/:unitId/leases/
 * - Creates a stable cache boundary per org + unit via queryKey
 * - Prevents UI from owning fetch state (TanStack Query does it)
 *
 * Multi-tenant hardening:
 * - orgSlug is included in the queryKey to avoid cross-org cache collisions.
 *
 * API expectations:
 * - GET /api/v1/units/:unitId/leases/
 * - returns Lease[] OR paginated { results: Lease[] }
 */
export function useUnitLeasesQuery({ orgSlug, unitId }: UnitLeasesQueryParams) {
  return useQuery<Lease[]>({
    // Step 1: Cache boundary (org + unit)
    queryKey: ["unitLeases", orgSlug, unitId],

    // Step 2: Fetcher (server state)
    queryFn: async () => {
      // Step 2a: We call axios directly to avoid blocking on an api module
      // (X-Org-Slug + Authorization are attached by your axios setup)
      const res = await api.get(`/api/v1/units/${unitId}/leases/`);

      // Step 2b: Robust response shape handling
      const data: any = res.data;
      const results = data?.results ?? data;

      return (results ?? []) as Lease[];
    },

    // Step 3: Don’t run unless inputs are valid
    enabled: Boolean(orgSlug) && Number.isFinite(unitId) && unitId > 0,

    // Step 4: When unitId changes, keep previous results while new unit loads
    placeholderData: keepPreviousData,
  });
}
