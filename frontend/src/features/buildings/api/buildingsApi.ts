
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
 *
 * Supports:
 * - Building[]
 * - DRF paginated: { results: Building[] }
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

  // Step 3: Fail-safe (prevents crashes, but surfaces a clear console signal)
  // eslint-disable-next-line no-console
  console.error("Unexpected list response shape:", data);
  return [];
}

/**
 * listBuildings
 *
 * GET /api/v1/buildings
 */
export async function listBuildings(): Promise<Building[]> {
  // Step 1: Request
  const res = await api.get<Building[] | DRFPaginated<Building>>("/api/v1/buildings/");

  // Step 2: Normalize into a predictable array for UI consumption
  return normalizeListResponse<Building>(res.data);
}

/**
 * createBuilding
 *
 * POST /api/v1/buildings
 */
export async function createBuilding(
  payload: CreateBuildingInput,
): Promise<Building> {
  // Step 1: Request
  const res = await api.post<Building>("/api/v1/buildings/", payload);

  // Step 2: Return created entity
  return res.data;
}