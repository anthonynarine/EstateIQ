// # Filename: src/features/buildings/queries/useBuildings.ts


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBuilding,
  listBuildings,
  getBuilding, 
} from "../../../api/buildingsApi";
import type { CreateBuildingInput } from "../../../api/buildingsApi";

export const BUILDINGS_KEYS = {
  all: (orgSlug: string) => ["org", orgSlug, "buildings"] as const,
  detail: (orgSlug: string, buildingId: number) =>
    ["org", orgSlug, "buildings", buildingId] as const,
};

export function useBuildingsQuery(orgSlug: string | null) {
  return useQuery({
    queryKey: orgSlug ? BUILDINGS_KEYS.all(orgSlug) : ["org", "none", "buildings"],
    enabled: Boolean(orgSlug),
    queryFn: async () => {
      if (!orgSlug) throw new Error("useBuildingsQuery called without orgSlug.");
      return await listBuildings(orgSlug);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useBuildingQuery(
  orgSlug: string | null,
  buildingId: number | null,
  enabledOverride?: boolean
) {
  const enabled = Boolean(orgSlug) && buildingId != null && (enabledOverride ?? true);

  return useQuery({
    queryKey:
      orgSlug && buildingId != null
        ? BUILDINGS_KEYS.detail(orgSlug, buildingId)
        : ["org", "none", "buildings", "none"],
    enabled,
    queryFn: async () => {
      if (!orgSlug) throw new Error("useBuildingQuery called without orgSlug.");
      if (buildingId == null) throw new Error("useBuildingQuery called without buildingId.");
      return await getBuilding(orgSlug, buildingId);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateBuildingMutation(orgSlug: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBuildingInput) => {
      if (!orgSlug) throw new Error("Cannot create building without orgSlug.");
      return await createBuilding(orgSlug, payload);
    },
    onSuccess: async () => {
      if (!orgSlug) return;
      await queryClient.invalidateQueries({ queryKey: BUILDINGS_KEYS.all(orgSlug) });
    },
  });
}