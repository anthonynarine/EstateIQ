
// # Filename: src/features/buildings/api/unitsApi.ts

import api from "../../../api/axios";

/**
 * Unit
 *
 * Frontend representation of a Unit record.
 *
 * Notes:
 * - Keep this aligned with the backend Unit serializer fields.
 * - Nullable numeric fields represent "unknown/not provided".
 */
export type Unit = {
  id: number;
  building: number;

  label: string;

  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;

  notes?: string | null;

  created_at?: string;
  updated_at?: string;
};

/**
 * CreateUnitInput
 *
 * Payload required to create a Unit under a specific Building.
 *
 * `building` is mandatory so the backend can enforce:
 * - parent relationship integrity
 * - org tenancy boundary via request.org
 */
export type CreateUnitInput = {
  building: number;
  label: string;

  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;

  notes?: string | null;
};

/**
 * DRFPaginated
 *
 * Minimal shape of Django REST Framework paginated responses.
 *
 * Many DRF list endpoints return:
 * {
 *   count: number,
 *   next: string | null,
 *   previous: string | null,
 *   results: T[]
 * }
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
 * Normalizes list endpoint responses into an array.
 *
 * Why:
 * - Some DRF endpoints return `T[]`
 * - Others return `{ results: T[] }` when pagination is enabled
 *
 * This keeps UI/query layers deterministic by always returning `T[]`.
 *
 * Args:
 *   data: unknown API response payload
 *
 * Returns:
 *   T[] (safe default = [])
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

  // Step 3: Defensive fallback to avoid UI crashes
  // eslint-disable-next-line no-console
  console.error("Unexpected list response shape:", data);
  return [];
}

/**
 * listUnitsByBuilding
 *
 * Fetches units scoped to a single building.
 *
 * Endpoint:
 * - GET /api/v1/units/?building=<buildingId>
 *
 * Multi-tenant boundary:
 * - axios attaches X-Org-Slug centrally
 * - backend resolves request.org and filters accordingly
 *
 * Args:
 *   buildingId: parent building id to filter units
 *
 * Returns:
 *   Unit[] (normalized from paginated or array responses)
 */
export async function listUnitsByBuilding(buildingId: number): Promise<Unit[]> {
  // Step 1: Request (axios normalizes trailing slash for DRF safety)
  const res = await api.get<Unit[] | DRFPaginated<Unit>>("/api/v1/units/", {
    params: { building: buildingId },
  });

  // Step 2: Normalize response to array
  return normalizeListResponse<Unit>(res.data);
}

/**
 * createUnit
 *
 * Creates a new unit under a building.
 *
 * Endpoint:
 * - POST /api/v1/units/
 *
 * Multi-tenant boundary:
 * - axios attaches X-Org-Slug centrally
 * - backend uses request.org + payload.building to validate ownership
 *
 * Args:
 *   payload: CreateUnitInput
 *
 * Returns:
 *   Unit (created unit record)
 */
export async function createUnit(payload: CreateUnitInput): Promise<Unit> {
  // Step 1: Request
  const res = await api.post<Unit>("/api/v1/units/", payload);

  // Step 2: Return created unit
  return res.data;
}