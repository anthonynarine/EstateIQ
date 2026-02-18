// # Filename: src/features/tenancy/queries/useTenantsQuery.ts
// ✅ New Code

import { useQuery } from "@tanstack/react-query";
import { listTenants } from "../../../api/tenantsApi";

/**
 * useTenantsQuery
 *
 * Server-state hook for listing tenants.
 * TanStack Query will:
 * - Cache results by queryKey (orgSlug + params)
 * - Deduplicate requests
 * - Provide loading/error states
 * - Refetch when the key changes (pagination / ordering changes)
 *
 * IMPORTANT: orgSlug is included in the queryKey to prevent cross-tenant cache leakage.
 */
type Params = {
  orgSlug: string | null;
  page: number;
  pageSize: number;
  ordering: string;
  search?: string;
};

export function useTenantsQuery({ orgSlug, page, pageSize, ordering, search }: Params) {
  return useQuery({
    // Step 1: Multi-tenant safe cache key
    queryKey: ["tenants", orgSlug, { page, pageSize, ordering, search }],

    // Step 2: Query function (async/await)
    queryFn: async () => {
      return await listTenants({ page, pageSize, ordering, search });
    },

    // Step 3: Don’t fetch until orgSlug exists
    enabled: Boolean(orgSlug),

    // Step 4: Smooth pagination UX (keeps previous data while new page loads)
    placeholderData: (prev) => prev,
  });
}
