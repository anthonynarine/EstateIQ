// # Filename: src/features/tenants/hooks/useUpdateTenantMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTenant } from "../api/tenantsApi";
import type { Tenant, UpdateTenantInput } from "../api/types";
import { tenantQueryKeys } from "../utils/tenantQueryKeys";

type UpdateTenantMutationInput = {
  tenantId: number;
  payload: UpdateTenantInput;
};

/**
 * useUpdateTenantMutation
 *
 * Mutation hook for partially updating a tenant within the current organization.
 *
 * Responsibilities:
 * - Call the tenant PATCH endpoint.
 * - Invalidate all org-scoped tenant directory cache variants on success.
 *
 * Important:
 * - We invalidate the org tenant namespace instead of one exact list key
 *   because the directory now supports pagination and search.
 */
export function useUpdateTenantMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, UpdateTenantMutationInput>({
    mutationFn: async ({ tenantId, payload }) => {
      // Step 1: Patch the tenant in the current org
      return await updateTenant(orgSlug, tenantId, payload);
    },
    onSuccess: async () => {
      // Step 2: Invalidate all tenant queries for this org
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.org(orgSlug),
      });
    },
  });
}