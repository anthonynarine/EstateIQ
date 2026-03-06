// # Filename: src/features/buildings/hooks/useUnitDetailQuery.ts


import { useQuery } from "@tanstack/react-query";
import api from "../../../../../api/axios";

export type UnitSummary = {
  id: number;
  label: string;
  building: {
    id: number;
    name: string;
  };
  bedrooms?: number;
  bathrooms?: number | string;
  sqft?: number | null;
  is_occupied?: boolean;
  active_lease_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * useUnitDetailQuery
 *
 * Fetches the detail payload for a single unit, scoped by organization.
 *
 * @param orgSlug The active organization slug.
 * @param unitId The unit primary key from the route.
 * @returns TanStack Query result for the unit detail payload.
 */
export function useUnitDetailQuery(orgSlug: string, unitId: number) {
  return useQuery<UnitSummary>({
    queryKey: ["unit-detail", orgSlug, unitId],
    queryFn: async () => {
      // Step 1: Request the org-scoped unit detail record.
      const response = await api.get<UnitSummary>(`/api/v1/units/${unitId}/`, {
        params: { org: orgSlug },
      });
      return response.data;
    },
    enabled: Boolean(orgSlug) && Number.isFinite(unitId) && unitId > 0,
    staleTime: 60_000,
  });
}