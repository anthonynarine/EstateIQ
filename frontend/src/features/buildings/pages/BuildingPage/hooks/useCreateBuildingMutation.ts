// # Filename: src/features/buildings/hooks/useCreateBuildingMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBuilding,
  type CreateBuildingInput,
} from "../../../api/buildingsApi";
import { BUILDINGS_KEYS } from "./useBuildings";

/**
 * useCreateBuildingMutation
 *
 * Creates a building for the active org and invalidates building list queries.
 */
export function useCreateBuildingMutation(orgSlug: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBuildingInput) => {
      if (!orgSlug) {
        throw new Error("Cannot create building without orgSlug.");
      }

      return await createBuilding(orgSlug, payload);
    },
    onSuccess: async () => {
      if (!orgSlug) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: BUILDINGS_KEYS.all(orgSlug),
      });
    },
  });
}