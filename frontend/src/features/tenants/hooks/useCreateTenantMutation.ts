// # Filename: src/features/tenants/hooks/useCreateTenantMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTenant } from "../api/tenantsApi";
import type { CreateTenantInput, Tenant } from "../api/types";
import { tenantQueryKeys } from "../utils/tenantQueryKeys";

/**
 * useCreateTenantMutation
 *
 * Mutation hook for creating a tenant within the current organization.
 */
export function useCreateTenantMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, CreateTenantInput>({
    mutationFn: async (payload) => {
      // Step 1: Create the tenant in the current org
      return await createTenant(orgSlug, payload);
    },
    onSuccess: async () => {
      // Step 2: Invalidate all tenant queries for this org
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.org(orgSlug),
      });
    },
  });
}