// # Filename: src/features/leases/queries/useCreateLeaseMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lease, CreateLeaseInput } from "../api/leaseApi";
import { createLease } from "../api/leaseApi";
import { leasesByUnitQueryKey } from "./useLeasesByUnitQuery";

/**
 * UseCreateLeaseMutationArgs
 *
 * @property orgSlug - Canonical org slug used for cache isolation and org-scoped invalidation.
 * @property unitId - Unit id leases are being created for.
 */
type UseCreateLeaseMutationArgs = {
  orgSlug: string;
  unitId: number;
};

type CreateLeaseFormInput = Omit<CreateLeaseInput, "unit">;

/**
 * useCreateLeaseMutation
 *
 * Creates a lease under a specific unit (unit enforced internally).
 *
 * Guarantees:
 * - Unit id is injected internally (callers cannot spoof unit).
 * - Cache invalidation is deterministic using org-scoped query keys:
 *   - invalidates ["org", orgSlug, "leases", "unit", unitId]
 * - Uses centralized axios client implicitly via createLease()
 *   (Authorization + X-Org-Slug applied there).
 *
 * Error behavior:
 * - DRF validation errors surface via the thrown axios error.
 * - Consumers should parse `error.response?.data` for field errors.
 *
 * @param args.orgSlug - Canonical org slug
 * @param args.unitId - Unit id
 */
export function useCreateLeaseMutation({ orgSlug, unitId }: UseCreateLeaseMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Validate inputs early to prevent accidental invalidations
  const safeOrgSlug = orgSlug?.trim();
  const safeUnitId = Number(unitId);

  return useMutation<Lease, unknown, CreateLeaseFormInput>({
    mutationFn: async (input) => {
      // Step 2: Defense-in-depth: ensure unit is always enforced internally
      const payload: CreateLeaseInput = {
        ...input,
        unit: safeUnitId,
      };

      // Step 3: Perform request
      return await createLease(payload);
    },

    onSuccess: async () => {
      // Step 4: Invalidate unit-scoped leases so lists update deterministically
      await queryClient.invalidateQueries({
        queryKey: leasesByUnitQueryKey(safeOrgSlug, safeUnitId),
      });
    },
  });
}