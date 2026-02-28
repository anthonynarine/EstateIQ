// # Filename: src/features/leases/queries/useLeasesByUnitQuery.ts

import { useQuery } from "@tanstack/react-query";
import type { Lease } from "../api/leaseApi";
import { listLeasesByUnit } from "../api/leaseApi";

/**
 * leasesByUnitQueryKey
 *
 * Enterprise cache isolation rule:
 * - Keys MUST begin with ["org", orgSlug, ...] to prevent cross-tenant cache bleed.
 * - Unit-scoped leases live under ["org", orgSlug, "leases", "unit", unitId]
 *
 * @param orgSlug - Canonical org identifier (from OrgProvider / URL)
 * @param unitId - Unit primary key
 * @returns TanStack Query key tuple
 */
export function leasesByUnitQueryKey(orgSlug: string, unitId: number) {
  return ["org", orgSlug, "leases", "unit", unitId] as const;
}

type UseLeasesByUnitQueryArgs = {
  orgSlug: string | null | undefined;
  unitId: number | null | undefined;
  enabled?: boolean;
};

/**
 * useLeasesByUnitQuery
 *
 * Reads leases for a unit in an org-scoped way.
 *
 * Contract:
 * - Does NOT fire if orgSlug or unitId is missing/invalid.
 * - Uses centralized axios client headers:
 *   - Authorization: Bearer <access>
 *   - X-Org-Slug: <orgSlug>
 * - Returns a deterministic array of Lease objects (empty array when none).
 *
 * Caching:
 * - orgSlug is part of the key -> no cache bleed between orgs.
 *
 * @param args.orgSlug - Canonical org slug (required to query)
 * @param args.unitId - Unit id (required to query)
 * @param args.enabled - Optional flag to further gate query execution
 */
export function useLeasesByUnitQuery({
  orgSlug,
  unitId,
  enabled = true,
}: UseLeasesByUnitQueryArgs) {
  // Step 1: Validate inputs
  const hasOrg = Boolean(orgSlug && orgSlug.trim().length > 0);
  const hasUnitId = typeof unitId === "number" && Number.isFinite(unitId);

  // Step 2: Gate query execution to prevent accidental cross-tenant or invalid requests
  const isEnabled = enabled && hasOrg && hasUnitId;

  // Step 3: Run query (TanStack Query is the single source of truth for server state)
  return useQuery<Lease[]>({
    queryKey: isEnabled ? leasesByUnitQueryKey(orgSlug as string, unitId as number) : [],
    enabled: isEnabled,
    queryFn: async () => {
      // Step 4: This should never run unless isEnabled is true, but keep defense-in-depth
      if (!orgSlug) return [];
      if (typeof unitId !== "number" || !Number.isFinite(unitId)) return [];

      const leases = await listLeasesByUnit(unitId);
      return Array.isArray(leases) ? leases : [];
    },
    // Step 5: Production defaults
    staleTime: 15_000, // reduces refetch chatter while still keeping UI fresh
    gcTime: 5 * 60_000, // keep cache warm briefly (good UX when navigating back/forward)
    refetchOnWindowFocus: false, // avoid surprise refetches during demos
    retry: 1, // minimal retry; auth/403 issues should surface clearly
  });
}