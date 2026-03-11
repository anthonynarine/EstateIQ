// # Filename: src/features/leases/queries/useCreateLeaseMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lease, CreateLeaseInput } from "../api/leaseApi";
import { createLease } from "../api/leaseApi";
import { leasesByUnitQueryKey } from "./useLeasesByUnitQuery";

/**
 * UseCreateLeaseMutationArgs
 *
 * Shared create mutation args.
 */
type UseCreateLeaseMutationArgs = {
  orgSlug: string;
};

/**
 * UseCreateLeaseForUnitMutationArgs
 *
 * Unit-scoped helper args for the existing unit-first workflow.
 */
type UseCreateLeaseForUnitMutationArgs = {
  orgSlug: string;
  unitId: number;
};

/**
 * CreateLeaseForUnitInput
 *
 * Payload for the compatibility unit-first helper.
 * The helper injects `unit` internally.
 */
type CreateLeaseForUnitInput = Omit<CreateLeaseInput, "unit">;

/**
 * isValidPositiveInt
 *
 * Checks whether a value is a valid positive integer.
 *
 * @param value Candidate number
 * @returns True when valid
 */
function isValidPositiveInt(value: number | null | undefined): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * invalidateLeaseCreateCaches
 *
 * Invalidates the primary lease caches after create.
 *
 * @param queryClient React Query client
 * @param orgSlug Canonical org slug
 * @param unitId Unit id tied to the created lease
 */
async function invalidateLeaseCreateCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orgSlug: string,
  unitId: number
): Promise<void> {
  // Step 1: Invalidate the unit lease history/cache
  await queryClient.invalidateQueries({
    queryKey: leasesByUnitQueryKey(orgSlug, unitId),
  });

  // Step 2: Future expansion point
  // Add tenant-scoped or building-scoped invalidations here later.
}

/**
 * useCreateLeaseMutation
 *
 * Shared mutation for the unified lease create page.
 *
 * Supports:
 * - unit-first
 * - tenant-first
 * - combined
 * - blank/manual
 */
export function useCreateLeaseMutation({
  orgSlug,
}: UseCreateLeaseMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Normalize org slug
  const safeOrgSlug = orgSlug?.trim() ?? "";

  return useMutation<Lease, unknown, CreateLeaseInput>({
    mutationFn: async (input) => {
      // Step 2: Submit shared create payload directly
      return await createLease(input);
    },

    onSuccess: async (createdLease) => {
      // Step 3: Invalidate from authoritative server response
      await invalidateLeaseCreateCaches(
        queryClient,
        safeOrgSlug,
        createdLease.unit
      );
    },
  });
}

/**
 * useCreateLeaseForUnitMutation
 *
 * Compatibility helper for the existing Building Detail / Unit workflow.
 *
 * Use this only when the unit is already known and should be enforced
 * internally by the hook.
 */
export function useCreateLeaseForUnitMutation({
  orgSlug,
  unitId,
}: UseCreateLeaseForUnitMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Normalize inputs
  const safeOrgSlug = orgSlug?.trim() ?? "";
  const safeUnitId = Number(unitId);

  return useMutation<Lease, unknown, CreateLeaseForUnitInput>({
    mutationFn: async (input) => {
      // Step 2: Guard invalid unit ids early
      if (!isValidPositiveInt(safeUnitId)) {
        throw new Error(
          "Invalid unit id passed to useCreateLeaseForUnitMutation."
        );
      }

      // Step 3: Enforce the unit internally for unit-first workflows
      const payload: CreateLeaseInput = {
        ...input,
        unit: safeUnitId,
      };

      // Step 4: Submit request
      return await createLease(payload);
    },

    onSuccess: async (createdLease) => {
      // Step 5: Invalidate caches from authoritative response
      await invalidateLeaseCreateCaches(
        queryClient,
        safeOrgSlug,
        createdLease.unit
      );
    },
  });
}