// # Filename: src/features/leases/queries/useUpdateLeaseMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lease, UpdateLeaseInput } from "../api/leaseApi";
import { updateLease } from "../api/leaseApi";
import { leasesByUnitQueryKey } from "./useLeasesByUnitQuery";

type Args = {
  orgSlug: string;
  unitId: number;
};

type MutationInput = {
  leaseId: number;
  patch: UpdateLeaseInput;
};

/**
 * useUpdateLeaseMutation
 *
 * Updates an existing lease, then invalidates the unit's leases list.
 *
 * Guarantees:
 * - Deterministic invalidation: ["org", orgSlug, "leases", "unit", unitId]
 * - No manual refetch hacks
 *
 * @param args.orgSlug - Canonical org slug
 * @param args.unitId - Parent unit id (for correct invalidation scope)
 */
export function useUpdateLeaseMutation({ orgSlug, unitId }: Args) {
  const queryClient = useQueryClient();

  return useMutation<Lease, unknown, MutationInput>({
    mutationFn: async ({ leaseId, patch }) => {
      // Step 1: Execute PATCH
      return await updateLease(leaseId, patch);
    },
    onSuccess: async () => {
      // Step 2: Invalidate leases for this unit so UI updates deterministically
      await queryClient.invalidateQueries({
        queryKey: leasesByUnitQueryKey(orgSlug, unitId),
      });
    },
  });
}