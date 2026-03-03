// # Filename: src/features/buildings/queries/useUpdateBuildingMutation.ts
// ✅ New Code

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateBuilding,
  type UpdateBuildingInput,
  type Building,
} from "../../../api/buildingsApi";

/**
 * useUpdateBuildingMutation
 *
 * Updates a Building (PATCH) and keeps the buildings list cache in sync.
 *
 * Strategy:
 * - Optimistically patch building in any matching org-scoped list.
 * - Roll back on error.
 * - Invalidate to reconcile server truth.
 */
export function useUpdateBuildingMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buildingId,
      payload,
    }: {
      buildingId: number;
      payload: UpdateBuildingInput;
    }) => updateBuilding(buildingId, payload),

    onMutate: async ({ buildingId, payload }) => {
      // Step 1: Cancel outgoing fetches for this org's buildings list
      await queryClient.cancelQueries({
        queryKey: ["org", orgSlug, "buildings"],
      });

      // Step 2: Snapshot previous list
      const previous =
        queryClient.getQueryData<Building[]>([
          "org",
          orgSlug,
          "buildings",
        ]) ?? [];

      // Step 3: Optimistically patch
      const next = previous.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              ...payload,
            }
          : b
      );

      queryClient.setQueryData(["org", orgSlug, "buildings"], next);

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      // Step 4: Rollback
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["org", orgSlug, "buildings"],
          ctx.previous
        );
      }
    },

    onSuccess: () => {
      // Step 5: Reconcile with backend truth
      queryClient.invalidateQueries({
        queryKey: ["org", orgSlug, "buildings"],
      });
    },
  });
}