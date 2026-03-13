// # Filename: src/features/leases/queries/useLeasesByUnitQuery.ts

import { useQuery } from "@tanstack/react-query";
import type { Lease } from "../api/types";
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
 */
export function useLeasesByUnitQuery({
  orgSlug,
  unitId,
  enabled = true,
}: UseLeasesByUnitQueryArgs) {
  // Step 1: Validate inputs
  const hasOrg = Boolean(orgSlug && orgSlug.trim().length > 0);
  const hasUnitId = typeof unitId === "number" && Number.isFinite(unitId);

  // Step 2: Gate query execution
  const isEnabled = enabled && hasOrg && hasUnitId;

  return useQuery<Lease[]>({
    queryKey: isEnabled
      ? leasesByUnitQueryKey(orgSlug as string, unitId as number)
      : [],
    enabled: isEnabled,
    queryFn: async () => {
      // Step 3: Defense-in-depth guard
      if (!orgSlug) return [];
      if (typeof unitId !== "number" || !Number.isFinite(unitId)) return [];

      const leases = await listLeasesByUnit(unitId);
      return Array.isArray(leases) ? leases : [];
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}