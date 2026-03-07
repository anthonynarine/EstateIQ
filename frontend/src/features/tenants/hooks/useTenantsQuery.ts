// # Filename: src/features/tenants/hooks/useTenantsQuery.ts

import { useQuery } from "@tanstack/react-query";
import { listTenants } from "../api/tenantsApi";
import type { Tenant } from "../api/types";

/**
 * tenantsQueryKey
 *
 * Canonical query key for the tenant directory within an organization.
 *
 * Shape:
 *   ["org", orgSlug, "tenants"]
 *
 * Why:
 * - Keeps all org-scoped cache keys consistent
 * - Prevents cross-tenant cache bleed
 * - Gives mutations one exact key to invalidate
 */
export function tenantsQueryKey(orgSlug: string) {
  // Step 1: Return canonical org-scoped key
  return ["org", orgSlug, "tenants"] as const;
}

/**
 * useTenantsQuery
 *
 * TanStack Query hook for tenant directory data.
 *
 * Responsibilities:
 * - Fetch tenants for the active org
 * - Cache the response by orgSlug
 * - Expose loading/error state to the UI
 */
export function useTenantsQuery(orgSlug: string) {
  // Step 1: Guard execution until org context exists
  const canFetch = Boolean(orgSlug);

  return useQuery<Tenant[], Error>({
    // Step 2: Use canonical query key
    queryKey: canFetch
      ? tenantsQueryKey(orgSlug)
      : (["org", "missing-org", "tenants"] as const),

    // Step 3: Fetch function
    queryFn: async () => {
      if (!orgSlug) {
        return [];
      }

      return await listTenants(orgSlug);
    },

    // Step 4: Execution gate
    enabled: canFetch,

    // Step 5: Reasonable freshness for CRUD directory UX
    staleTime: 30_000,
    gcTime: 5 * 60_000,

    // Step 6: UX improvements
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const message = String(error?.message ?? "");

      if (message.includes("401") || message.includes("403")) {
        return false;
      }

      return failureCount < 2;
    },
  });
}