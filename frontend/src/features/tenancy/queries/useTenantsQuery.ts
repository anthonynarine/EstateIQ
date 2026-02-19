// # Filename: src/features/tenancy/hooks/useTenantsQuery.ts


import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listTenants } from "../../../api/tenantsApi";
import type { Tenant } from "../types";

export type TenantsQueryParams = {
  orgSlug: string;
  page: number;
  pageSize: number;
  ordering?: string;
  search?: string;
};

export type TenantsQueryResult = {
  results: Tenant[];
  count: number;
  next: string | null;
  previous: string | null;
};

/**
 * Tenants query hook (server-state).
 *
 * Why TanStack Query here:
 * - Caches results by queryKey
 * - Automatically manages loading/error states
 * - Supports pagination without UI flicker (keepPreviousData)
 * - Keeps org data isolated by including orgSlug in the queryKey (multi-tenant safety)
 *
 * Expected API contract:
 * listTenants({ page, pageSize, ordering, search }) -> { results, count, next, previous }
 */
export function useTenantsQuery(params: TenantsQueryParams) {
  const { orgSlug, page, pageSize, ordering, search } = params;

  return useQuery<TenantsQueryResult>({
    // Step 1: Query keys define caching boundaries.
    // Including orgSlug prevents cross-org cache bleed.
    queryKey: ["tenants", orgSlug, page, pageSize, ordering ?? "", search ?? ""],

    // Step 2: Query function fetches data (server state).
    queryFn: async () => {
      // Step 2a: We intentionally do NOT pass orgSlug here because your axios
      // instance attaches X-Org-Slug automatically (via interceptor/provider).
      const data = await listTenants({
        page,
        pageSize,
        ordering,
        search,
      });

      // Step 2b: Normalize to a strict shape for the UI.
      return {
        results: data.results ?? [],
        count: data.count ?? 0,
        next: data.next ?? null,
        previous: data.previous ?? null,
      };
    },

    // Step 3: Don’t run until orgSlug exists (prevents 403 spam).
    enabled: Boolean(orgSlug),

    // Step 4: Keep old page results while fetching the next page (no table flicker).
    placeholderData: keepPreviousData,
  });
}
