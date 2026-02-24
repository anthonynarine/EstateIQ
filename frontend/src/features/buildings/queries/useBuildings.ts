
// # Filename: src/features/buildings/queries/useBuildings.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBuilding, listBuildings } from "../api/buildingsApi";
import type { CreateBuildingInput } from "../api/buildingsApi";

/**
 * BUILDINGS_KEYS
 *
 * Centralized query keys for Buildings.
 * Always org-scoped to prevent cross-tenant cache bleed.
 */
export const BUILDINGS_KEYS = {
  all: (orgSlug: string) => ["org", orgSlug, "buildings"] as const,
};

/**
 * useBuildingsQuery
 *
 * Lists buildings for the active org.
 *
 * Multi-tenant contract:
 * - orgSlug is the canonical context (URL-driven by OrgProvider)
 * - axios attaches X-Org-Slug centrally (no per-call header hacks)
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
        // Guard against misuse; should not run due to enabled:false
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