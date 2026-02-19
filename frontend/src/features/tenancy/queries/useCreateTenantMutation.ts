// # Filename: src/features/tenancy/queries/useCreateTenantMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenant } from "../../../api/tenantsApi";
import { formatApiError } from "../../../api/formatApiError";
import type { Tenant } from "../types";

export type CreateTenantPayload = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * Create Tenant mutation hook (server write).
 *
 * What this solves:
 * - Centralizes tenant creation logic
 * - On success, invalidates all cached tenant list queries for the active org
 *   so the UI refreshes consistently without manual refetching.
 *
 * Multi-tenant safety:
 * - We invalidate using the orgSlug-scoped key prefix: ["tenants", orgSlug]
 */
export function useCreateTenantMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<Tenant, unknown, CreateTenantPayload>({
    // Step 1: Perform the POST request
    mutationFn: async (payload) => {
      const tenant = await createTenant(payload);
      return tenant;
    },

    // Step 2: On success, refresh tenant lists for this org
    onSuccess: async () => {
      // Important: this invalidates *all* tenant list queries for this org
      // (all pages, orderings, searches) because they share this prefix.
      await queryClient.invalidateQueries({
        queryKey: ["tenants", orgSlug],
      });
    },
  });

  // Step 3: Normalize error message for UI
  const errorMessage = mutation.error ? formatApiError(mutation.error) : null;

  return {
    ...mutation,
    errorMessage,
  };
}
