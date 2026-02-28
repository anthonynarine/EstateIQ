// # Filename: src/features/buildings/queries/useCreateUnitMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUnit, type CreateUnitInput, type Unit } from "../api/unitsApi";
import { unitsQueryKey } from "./useUnitsQuery"; 

/**
 * UseCreateUnitMutationArgs
 *
 * Required context to perform a create-unit mutation safely.
 *
 * Why we require these:
 * - orgSlug is required for tenant-safe query invalidation keys.
 * - buildingId is required because Units are nested under a Building.
 *
 * Notes:
 * - We do NOT pass headers here.
 * - axios attaches Authorization + X-Org-Slug centrally.
 */
type UseCreateUnitMutationArgs = {
  orgSlug: string | null;
  buildingId: number | null;
};

/**
 * useCreateUnitMutation
 *
 * Creates a Unit under a Building and invalidates the Units list query for that building.
 *
 * Cache strategy:
 * - Invalidate: ["org", orgSlug, "units", buildingId]
 * - No manual refetch hacks.
 * - TanStack Query remains the single source of server state.
 *
 * Security / tenancy:
 * - Backend enforces tenant boundary via request.org (derived from X-Org-Slug).
 * - If orgSlug is missing, this mutation will throw early.
 */
export function useCreateUnitMutation({
  orgSlug,
  buildingId,
}: UseCreateUnitMutationArgs) {
  const queryClient = useQueryClient();

  return useMutation<Unit, Error, Omit<CreateUnitInput, "building">>({
    /**
     * mutationFn
     *
     * Accepts form values excluding `building` because the page context
     * provides the buildingId (prevents user tampering + keeps UI simpler).
     */
    mutationFn: async (input) => {
      // Step 1: Hard guard required context
      if (!orgSlug) {
        throw new Error("Organization not selected (missing orgSlug).");
      }
      if (!buildingId) {
        throw new Error("Invalid building context (missing buildingId).");
      }

      // Step 2: Create payload with enforced building FK
      const payload: CreateUnitInput = {
        building: buildingId,
        ...input,
      };

      // Step 3: Execute API call
      return await createUnit(payload);
    },

    /**
     * onSuccess
     *
     * Invalidate Units list for this building so UI updates deterministically.
     */
    onSuccess: async () => {
      // Step 1: Only invalidate when keys are valid
      if (!orgSlug || !buildingId) return;

      // Step 2: Invalidate the exact tenant+building scoped list
      await queryClient.invalidateQueries({
        queryKey: unitsQueryKey(orgSlug, buildingId),
      });
    },
  });
}