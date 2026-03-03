// # Filename: src/features/buildings/queries/useDeleteBuildingMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBuilding, type Building } from "../../../api/buildingsApi";

/**
 * useDeleteBuildingMutation
 *
 * Deletes a Building and keeps UI in sync.
 *
 * Handles:
 * - Optimistic removal
 * - Rollback on error
 * - Reconciliation invalidation
 */
export function useDeleteBuildingMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (buildingId: number) =>
      deleteBuilding(buildingId),

    onMutate: async (buildingId: number) => {
      await queryClient.cancelQueries({
        queryKey: ["org", orgSlug, "buildings"],
      });

      const previous =
        queryClient.getQueryData<Building[]>([
          "org",
          orgSlug,
          "buildings",
        ]) ?? [];

      const next = previous.filter((b) => b.id !== buildingId);

      queryClient.setQueryData(["org", orgSlug, "buildings"], next);

      return { previous };
    },

    onError: (_err, _buildingId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["org", orgSlug, "buildings"],
          ctx.previous
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org", orgSlug, "buildings"],
      });
    },
  });
}