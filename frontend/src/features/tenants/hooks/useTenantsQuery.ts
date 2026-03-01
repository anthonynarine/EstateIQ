// # Filename: src/features/tenants/hooks/useTenantsQuery.ts


import { useQuery } from "@tanstack/react-query";
import { listTenants } from "../api/tenantsApi";

/**
 * useTenantsQuery
 *
 * TanStack Query hook for tenant directory data.
 *
 * Responsibilities:
 * - Fetch tenants for the active org.
 * - Cache the response by orgSlug (multi-tenant safe).
 * - Provide loading/error states to UI.
 *
 * Why this matters:
 * - Tenants are a shared reference entity used by leases.
 * - We want one consistent cache for all components (CreateLeaseForm, TenantsPage, etc.)
 *
 * Cache key strategy:
 * - ["org", orgSlug, "tenants"]
 *   This guarantees no cross-tenant cache pollution.
 */
export function useTenantsQuery(orgSlug: string) {
  return useQuery({
    // Step 1: Org-scoped query key
    queryKey: ["org", orgSlug, "tenants"],

    // Step 2: Fetch function
    queryFn: async () => await listTenants(orgSlug),

    // Step 3: Do not fetch until orgSlug is known
    enabled: Boolean(orgSlug),

    // Step 4: Slightly sticky cache to reduce refetch churn
    staleTime: 30_000,
  });
}