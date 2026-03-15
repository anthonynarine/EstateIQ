// # Filename: src/features/tenants/hooks/useUpdateTenantMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTenant } from "../api/tenantsApi";
import type { TenantWriteResponse, UpdateTenantInput } from "../api/types";
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
 * Important:
 * - The mutation returns the lean write response.
 * - Directory/detail read-model fields should come from refetched queries.
 */
export function useUpdateTenantMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<TenantWriteResponse, Error, UpdateTenantMutationInput>({
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