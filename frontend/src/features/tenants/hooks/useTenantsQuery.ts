// # Filename: src/features/tenants/hooks/useTenantsQuery.ts

import { useQuery } from "@tanstack/react-query";

import { listTenants } from "../api/tenantsApi";
import type { PaginatedResponse, Tenant, TenantListParams } from "../api/types";
import { tenantQueryKeys } from "../utils/tenantQueryKeys";
import { TENANT_DIRECTORY_PAGE_SIZE } from "../constants/tenantConstants";

/**
 * UseTenantsQueryParams
 *
 * Input contract for the tenant directory query hook.
 *
 * Why this shape matters:
 * - Keeps org scoping explicit.
 * - Makes pagination and search part of the cache key.
 * - Prevents page/search state from being hidden in component internals.
 */
type UseTenantsQueryParams = {
  orgSlug: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

/**
 * useTenantsQuery
 *
 * Fetches the paginated tenant directory for the given organization.
 *
 * Returns a DRF-style paginated envelope:
 * {
 *   count,
 *   next,
 *   previous,
 *   results
 * }
 *
 * Mobile/UI note:
 * - placeholderData preserves previous page results while the next page loads.
 */
export function useTenantsQuery({
  orgSlug,
  page = 1,
  pageSize = TENANT_DIRECTORY_PAGE_SIZE,
  search = "",
}: UseTenantsQueryParams) {
  const trimmedSearch = search.trim();

  return useQuery<PaginatedResponse<Tenant>, Error>({
    queryKey: tenantQueryKeys.list({
      orgSlug,
      page,
      pageSize,
      search: trimmedSearch,
    }),
    queryFn: async () => {
      // Step 1: Build the API params contract
      const params: TenantListParams = {
        page,
        page_size: pageSize,
        search: trimmedSearch || undefined,
      };

      // Step 2: Fetch the org-scoped paginated tenant list
      return await listTenants(orgSlug, params);
    },
    enabled: Boolean(orgSlug),
    placeholderData: (previousData) => previousData,
  });
}