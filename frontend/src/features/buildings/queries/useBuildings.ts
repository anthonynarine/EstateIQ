// # Filename: src/features/buildings/queries/useBuildings.ts


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBuilding,
  getBuilding, 
  listBuildings,
} from "../api/buildingsApi";
import type { CreateBuildingInput } from "../api/buildingsApi";

/**
 * BUILDINGS_KEYS
 *
 * Centralized query keys for Buildings.
 * Always org-scoped to prevent cross-tenant cache bleed.
 */
export const BUILDINGS_KEYS = {
  all: (orgSlug: string) => ["org", orgSlug, "buildings"] as const,

  // detail key (deep-link safe header data)
  detail: (orgSlug: string, buildingId: number) =>
    ["org", orgSlug, "buildings", buildingId] as const,
};

/**
 * useBuildingsQuery
 *
 * Lists buildings for the active org.
 */
export function useBuildingsQuery(orgSlug: string | null) {
  return useQuery({
    // Step 1: Tenant-safe cache key
    queryKey: orgSlug ? BUILDINGS_KEYS.all(orgSlug) : ["org", "none", "buildings"],

    // Step 2: Block request if orgSlug missing
    enabled: Boolean(orgSlug),

    // Step 3: Fetch
    queryFn: async () => {
      if (!orgSlug) {
        throw new Error("useBuildingsQuery called without orgSlug.");
      }
      return await listBuildings();
    },

    // Step 4: Good defaults
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * useBuildingQuery
 *
 * Fetch a single building (used by BuildingDetailPage for refresh/deep-links).
 */
export function useBuildingQuery(
  orgSlug: string | null,
  buildingId: number | null,
  enabledOverride?: boolean,
) {
  const enabled = Boolean(orgSlug) && Boolean(buildingId) && (enabledOverride ?? true);

  return useQuery({
    // Step 1: Org-scoped, id-scoped key
    queryKey:
      orgSlug && buildingId != null
        ? BUILDINGS_KEYS.detail(orgSlug, buildingId)
        : ["org", "none", "buildings", "none"],

    // Step 2: Gate request
    enabled,

    // Step 3: Fetch
    queryFn: async () => {
      if (!orgSlug) throw new Error("useBuildingQuery called without orgSlug.");
      if (buildingId == null) throw new Error("useBuildingQuery called without buildingId.");
      return await getBuilding(buildingId);
    },

    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * useCreateBuildingMutation
 *
 * Creates a building under the active org, then invalidates the org buildings list.
 */
export function useCreateBuildingMutation(orgSlug: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    // Step 1: Create
    mutationFn: async (payload: CreateBuildingInput) => {
      if (!orgSlug) {
        throw new Error("Cannot create building without orgSlug.");
      }
      return await createBuilding(payload);
    },

    // Step 2: Refresh list
    onSuccess: async () => {
      if (!orgSlug) return;
      await queryClient.invalidateQueries({
        queryKey: BUILDINGS_KEYS.all(orgSlug),
      });
    },
  });
}