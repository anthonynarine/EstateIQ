// # Filename: src/api/unitsApi.ts
// ✅ New Code

import axiosClient from "./axios";

export type Unit = {
  id: number;
  building?: number | null;
  name?: string | null; // if your backend uses unit_number/label instead, adjust
  unit_number?: string | null;
  floor?: string | number | null;
};

/**
 * listUnits
 *
 * Fetch units for the active org (X-Org-Slug attached by axios).
 *
 * Expected backend shape:
 * - Paginated: { count, next, previous, results: Unit[] }
 * - Or non-paginated: Unit[]
 */
export async function listUnits(params?: {
  page?: number;
  pageSize?: number;
  ordering?: string;
  building?: number;
  search?: string;
}): Promise<any> {
  // Step 1: Map FE params to DRF params
  const queryParams: Record<string, string | number | undefined> = {
    page: params?.page,
    page_size: params?.pageSize,
    ordering: params?.ordering,
    building: params?.building,
    search: params?.search,
  };

  // Step 2: GET units list
  const res = await axiosClient.get("/api/v1/units/", { params: queryParams });
  return res.data;
}
