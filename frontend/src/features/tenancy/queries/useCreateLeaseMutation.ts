// # Filename: src/features/tenancy/queries/useCreateLeaseMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLease } from "../../../api/leaseApi"
import { formatApiError } from "../../../api/formatApiError";
import type { CreateLeasePayload, Lease } from "../types";

type Params = {
  orgSlug: string;
  unitId: number;
};

/**
 * Create Lease mutation hook (server write).
 *
 * Behavior:
 * - Calls POST /api/v1/leases/
 * - On success, invalidates the unit leases query for the current org + unit:
 *   ["unitLeases", orgSlug, unitId]
 *
 * Why invalidation matters:
 * - Keeps UI consistent across pages/components
 * - Avoids manual refetch logic and prevents stale list bugs
 */
export function useCreateLeaseMutation({ orgSlug, unitId }: Params) {
  const queryClient = useQueryClient();

  const mutation = useMutation<Lease, unknown, CreateLeasePayload>({
    // Step 1: perform the network write
    mutationFn: async (payload) => {
      const lease = await createLease(payload);
      return lease;
    },

    // Step 2: on success, refresh the unit leases cache for this org+unit
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["unitLeases", orgSlug, unitId],
      });
    },
  });

  // Step 3: normalize error for UI rendering
  const errorMessage = mutation.error ? formatApiError(mutation.error) : null;

  return {
    ...mutation,
    errorMessage,
  };
}
