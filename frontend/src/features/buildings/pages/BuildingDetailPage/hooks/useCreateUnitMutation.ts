// # Filename: src/features/buildings/hooks/useCreateUnitMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createUnit,
  type CreateUnitInput,
  type Unit,
} from "../../../api/unitsApi";

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
 * Creates a Unit under a Building and invalidates all paginated Units list
 * queries for that building.
 *
 * Cache strategy:
 * - Invalidate prefix: ["org", orgSlug, "units", buildingId]
 * - This catches page 1, page 2, and any page-size variants.
 *
 * Security / tenancy:
 * - Backend enforces tenant boundary via request.org.
 * - If orgSlug is missing, this mutation throws early.
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
     * provides the buildingId.
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
     * Invalidate all paginated Units queries for this building so the UI
     * refreshes immediately without a manual page reload.
     */
    onSuccess: async () => {
      if (!orgSlug || !buildingId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["org", orgSlug, "units", buildingId],
      });
    },
  });
}