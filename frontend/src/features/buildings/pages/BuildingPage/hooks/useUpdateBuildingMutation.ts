// # Filename: src/features/buildings/queries/useUpdateBuildingMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateBuilding,
  type Building,
  type UpdateBuildingInput,
} from "../../../api/buildingsApi";

type DRFPaginated<T> = { results: T[]; [key: string]: unknown };
type BuildingsCacheShape = Building[] | DRFPaginated<Building> | undefined;

function isPaginated<T>(v: unknown): v is DRFPaginated<T> {
  return Boolean(v) && typeof v === "object" && Array.isArray((v as any).results);
}

function patchCache(
  current: BuildingsCacheShape,
  buildingId: number,
  patch: UpdateBuildingInput
): BuildingsCacheShape {
  // Step 1: Plain array
  if (Array.isArray(current)) {
    return current.map((b) => (b.id === buildingId ? { ...b, ...patch } : b));
  }

  // Step 2: DRF paginated shape
  if (isPaginated<Building>(current)) {
    return {
      ...current,
      results: current.results.map((b) =>
        b.id === buildingId ? { ...b, ...patch } : b
      ),
    };
  }

  return current;
}

/**
 * useUpdateBuildingMutation
 *
 * PATCH building with optimistic cache update.
 *
 * Notes:
 * - Supports both array and DRF paginated cache shapes.
 * - Invalidates list key to reconcile server truth.
 */
export function useUpdateBuildingMutation(orgSlug: string) {
  const queryClient = useQueryClient();
  const listKey = ["org", orgSlug, "buildings"] as const;

  return useMutation({
    mutationFn: async ({
      buildingId,
      payload,
    }: {
      buildingId: number;
      payload: UpdateBuildingInput;
    }) => updateBuilding(orgSlug, buildingId, payload),

    onMutate: async ({ buildingId, payload }) => {
      // Step 1: Cancel in-flight list requests
      await queryClient.cancelQueries({ queryKey: listKey });

      // Step 2: Snapshot previous cache
      const previous = queryClient.getQueryData<BuildingsCacheShape>(listKey);

      // Step 3: Optimistically patch
      queryClient.setQueryData<BuildingsCacheShape>(listKey, (current) =>
        patchCache(current as BuildingsCacheShape, buildingId, payload)
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      // Step 4: Rollback
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(listKey, ctx.previous);
      }
    },

    onSuccess: () => {
      // Step 5: Reconcile with backend truth
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}