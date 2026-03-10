// # Filename: src/features/buildings/hooks/useBuildings.ts


import { useQuery } from "@tanstack/react-query";
import { listBuildings, getBuilding } from "../../../api/buildingsApi";

export const BUILDINGS_KEYS = {
  all: (orgSlug: string) => ["org", orgSlug, "buildings"] as const,

  list: (orgSlug: string, page: number, pageSize: number) =>
    ["org", orgSlug, "buildings", "list", { page, pageSize }] as const,

  detail: (orgSlug: string, buildingId: number) =>
    ["org", orgSlug, "buildings", "detail", buildingId] as const,
};

/**
 * useBuildingsQuery
 *
 * Paginated buildings query for the buildings index page.
 */
export function useBuildingsQuery(
  orgSlug: string | null,
  page: number,
  pageSize: number
) {
  return useQuery({
    queryKey: orgSlug
      ? BUILDINGS_KEYS.list(orgSlug, page, pageSize)
      : ["org", "none", "buildings", "list", { page, pageSize }],
    enabled: Boolean(orgSlug),
    queryFn: async () => {
      if (!orgSlug) {
        throw new Error("useBuildingsQuery called without orgSlug.");
      }

      return await listBuildings({
        orgSlug,
        page,
        pageSize,
      });
    },
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * useBuildingQuery
 *
 * Single-building detail query.
 */
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
        : ["org", "none", "buildings", "detail", "none"],
    enabled,
    queryFn: async () => {
      if (!orgSlug) {
        throw new Error("useBuildingQuery called without orgSlug.");
      }

      if (buildingId == null) {
        throw new Error("useBuildingQuery called without buildingId.");
      }

      return await getBuilding(orgSlug, buildingId);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}