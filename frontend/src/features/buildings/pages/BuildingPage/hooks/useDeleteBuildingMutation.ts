// # Filename: src/features/buildings/queries/useDeleteBuildingMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBuilding, type Building } from "../../../api/buildingsApi";

type DRFPaginated<T> = { results: T[]; [key: string]: unknown };
type BuildingsCacheShape = Building[] | DRFPaginated<Building> | undefined;

function isPaginated<T>(v: unknown): v is DRFPaginated<T> {
  return Boolean(v) && typeof v === "object" && Array.isArray((v as any).results);
}

function removeFromCache(
  current: BuildingsCacheShape,
  buildingId: number
): BuildingsCacheShape {
  // Step 1: Plain array
  if (Array.isArray(current)) {
    return current.filter((b) => b.id !== buildingId);
  }

  // Step 2: DRF paginated
  if (isPaginated<Building>(current)) {
    return {
      ...current,
      results: current.results.filter((b) => b.id !== buildingId),
    };
  }

  return current;
}

/**
 * useDeleteBuildingMutation
 *
 * DELETE building with optimistic removal.
 *
 * Notes:
 * - Supports both array and DRF paginated cache shapes.
 * - Rolls back on error.
 * - Invalidates list key after success.
 */
export function useDeleteBuildingMutation(orgSlug: string) {
  const queryClient = useQueryClient();
  const listKey = ["org", orgSlug, "buildings"] as const;

  return useMutation({
    mutationFn: async (buildingId: number) => deleteBuilding(orgSlug, buildingId),

    onMutate: async (buildingId: number) => {
      // Step 1: Cancel in-flight list requests
      await queryClient.cancelQueries({ queryKey: listKey });

      // Step 2: Snapshot previous cache
      const previous = queryClient.getQueryData<BuildingsCacheShape>(listKey);

      // Step 3: Optimistically remove
      queryClient.setQueryData<BuildingsCacheShape>(listKey, (current) =>
        removeFromCache(current as BuildingsCacheShape, buildingId)
      );

      return { previous };
    },

    onError: (_err, _buildingId, ctx) => {
      // Step 4: Rollback
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(listKey, ctx.previous);
      }
    },

    onSuccess: () => {
      // Step 5: Reconcile
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}