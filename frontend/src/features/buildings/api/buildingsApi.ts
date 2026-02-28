// # Filename: src/features/buildings/api/buildingsApi.ts

import api from "../../../api/axios";

/**
 * Building
 *
 * Frontend representation of a Building record.
 */
export type Building = {
  id: number;
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  // Optional summary fields (if your API returns them on list/retrieve)
  units_count?: number;
  occupied_units_count?: number;
  vacant_units_count?: number;
};

/**
 * CreateBuildingInput
 *
 * Payload required to create a building.
 */
export type CreateBuildingInput = {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string | null;
  notes?: string | null;
};

/**
 * DRFPaginated
 *
 * Minimal shape for Django REST Framework paginated list responses.
 */
type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * normalizeListResponse
 *
 * Ensures list endpoints always return arrays to the UI layer.
 */
function normalizeListResponse<T>(data: unknown): T[] {
  // Step 1: Plain list response
  if (Array.isArray(data)) return data as T[];

  // Step 2: DRF paginated response
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as DRFPaginated<T>).results;
  }

  // Step 3: Fail-safe
  // eslint-disable-next-line no-console
  console.error("Unexpected list response shape:", data);
  return [];
}

/**
 * listBuildings
 *
 * GET /api/v1/buildings/
 */
export async function listBuildings(): Promise<Building[]> {
  // Step 1: Request
  const res = await api.get<Building[] | DRFPaginated<Building>>(
    "/api/v1/buildings/",
  );

  // Step 2: Normalize into a predictable array
  return normalizeListResponse<Building>(res.data);
}

/**
 * getBuilding
 *
 * GET /api/v1/buildings/:id/
 *
 * Used by BuildingDetailPage so address/name render even on refresh/deep link.
 */
export async function getBuilding(buildingId: number): Promise<Building> {
  // Step 1: Request
  const res = await api.get<Building>(`/api/v1/buildings/${buildingId}/`);

  // Step 2: Return entity
  return res.data;
}

/**
 * createBuilding
 *
 * POST /api/v1/buildings/
 */
export async function createBuilding(
  payload: CreateBuildingInput,
): Promise<Building> {
  // Step 1: Request
  const res = await api.post<Building>("/api/v1/buildings/", payload);

  // Step 2: Return created entity
  return res.data;
}