// # Filename: src/features/tenants/hooks/useTenantsQuery.ts
// ✅ New Code

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listTenants } from "../api/tenantsApi";
import type { PaginatedResponse, Tenant } from "../api/types";
import { tenantQueryKeys } from "../utils/tenantQueryKeys";

type UseTenantsQueryParams = {
  orgSlug: string;
  page: number;
  pageSize: number;
  search: string;
};

/**
 * useTenantsQuery
 *
 * Fetches the paginated tenant directory for the active organization.
 *
 * Why this hook exists:
 * - Keeps URL state, query state, and pagination aligned.
 * - Centralizes the query key contract for tenant directory caching.
 * - Preserves prior page data while the next page is loading.
 */
export function useTenantsQuery({
  orgSlug,
  page,
  pageSize,
  search,
}: UseTenantsQueryParams) {
  const normalizedSearch = search.trim();

  return useQuery<PaginatedResponse<Tenant>, Error>({
    queryKey: tenantQueryKeys.list({
      orgSlug,
      page,
      pageSize,
      search: normalizedSearch,
    }),
    queryFn: async () => {
      // Step 1: Fetch the tenant directory page
      return await listTenants(orgSlug, {
        page,
        page_size: pageSize,
        search: normalizedSearch || undefined,
      });
    },
    enabled: Boolean(orgSlug),
    placeholderData: keepPreviousData,
  });
}