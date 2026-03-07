// # Filename: src/features/tenants/hooks/useUpdateTenantMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { updateTenant } from "../api/tenantsApi";
import { tenantsQueryKey } from "./useTenantsQuery";
import type { Tenant, UpdateTenantInput } from "../api/types";

type UseUpdateTenantMutationParams = {
  orgSlug: string;
};

type ApiErrorDetail =
  | string
  | {
      detail?: string;
      [key: string]: unknown;
    }
  | Record<string, unknown>;

/**
 * extractErrorMessage
 *
 * Converts common API error shapes into a readable UI message.
 */
function extractErrorMessage(error: unknown): string {
  // Step 1: Handle axios errors
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorDetail | undefined;

    // Step 2: Simple string response
    if (typeof data === "string" && data.trim()) {
      return data;
    }

    // Step 3: DRF-style detail response
    if (data && typeof data === "object" && "detail" in data) {
      const detail = data.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }

    // Step 4: Field-level validation response
    if (data && typeof data === "object") {
      const firstEntry = Object.entries(data)[0];

      if (firstEntry) {
        const [field, value] = firstEntry;

        if (Array.isArray(value) && value.length > 0) {
          return `${field}: ${String(value[0])}`;
        }

        if (typeof value === "string" && value.trim()) {
          return `${field}: ${value}`;
        }
      }
    }
  }

  // Step 5: Generic JS error
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to update tenant.";
}

/**
 * useUpdateTenantMutation
 *
 * Org-scoped update mutation for tenant records.
 *
 * Responsibilities:
 * - call the tenant update API
 * - invalidate the exact tenant directory cache for the current org
 * - provide stable error handling for the UI
 */
export function useUpdateTenantMutation({
  orgSlug,
}: UseUpdateTenantMutationParams) {
  const queryClient = useQueryClient();

  return useMutation<
    Tenant,
    Error,
    {
      tenantId: number;
      payload: UpdateTenantInput;
    }
  >({
    mutationFn: async ({ tenantId, payload }) => {
      // Step 1: Hard guard required org context
      if (!orgSlug) {
        throw new Error("Organization not selected (missing orgSlug).");
      }

      // Step 2: Execute API request
      return await updateTenant(orgSlug, tenantId, payload);
    },

    onSuccess: async () => {
      // Step 3: Invalidate exact tenant directory cache
      if (!orgSlug) return;

      await queryClient.invalidateQueries({
        queryKey: tenantsQueryKey(orgSlug),
      });
    },

    onError: (error) => {
      // Step 4: Optional centralized logging point
      console.error("Update tenant failed:", error);
    },
  });
}

/**
 * getUpdateTenantErrorMessage
 *
 * Helper for pages/components that want a normalized UI-safe message.
 */
export function getUpdateTenantErrorMessage(error: unknown): string {
  return extractErrorMessage(error);
}