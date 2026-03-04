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
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;

  // Occupancy fields (computed server-side)
  is_occupied: boolean;
  active_lease_id: number | null;

  created_at: string;
  updated_at: string;
};

/**
 * CreateUnitInput
 *
 * Payload required to create a Unit under a specific Building.
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
 * UpdateUnitInput
 *
 * PATCH payload for updating a unit.
 *
 * IMPORTANT:
 * - `building` is intentionally excluded because the backend blocks changing
 *   a unit's building after creation (prevents silent "unit transfer").
 */
export type UpdateUnitInput = Partial<{
  label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  notes: string | null;
}>;

/**
 * DRFPaginated
 *
 * Minimal shape of Django REST Framework paginated responses.
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
 * Endpoint:
 * - GET /api/v1/units/?building=<buildingId>
 */
export async function listUnitsByBuilding(buildingId: number): Promise<Unit[]> {
  // Step 1: Request
  const res = await api.get<Unit[] | DRFPaginated<Unit>>("/api/v1/units/", {
    params: { building: buildingId },
  });

  // Step 2: Normalize response to array
  return normalizeListResponse<Unit>(res.data);
}

/**
 * createUnit
 *
 * Endpoint:
 * - POST /api/v1/units/
 */
export async function createUnit(payload: CreateUnitInput): Promise<Unit> {
  // Step 1: Request
  const res = await api.post<Unit>("/api/v1/units/", payload);

  // Step 2: Return created unit
  return res.data;
}

/**
 * updateUnit
 *
 * Partial update of a unit (PATCH).
 *
 * Endpoint:
 * - PATCH /api/v1/units/<unitId>/
 *
 * Notes:
 * - Do NOT send `building` here. Backend will reject building reassignment.
 */
export async function updateUnit(
  unitId: number,
  payload: UpdateUnitInput
): Promise<Unit> {
  // Step 1: Request
  const res = await api.patch<Unit>(`/api/v1/units/${unitId}/`, payload);

  // Step 2: Return updated record
  return res.data;
}

/**
 * deleteUnit
 *
 * Deletes a unit.
 *
 * Endpoint:
 * - DELETE /api/v1/units/<unitId>/
 *
 * Notes:
 * - Backend may respond 409 if unit has active lease or lease history.
 *   Surface `error.response.data.detail` in the UI confirm modal.
 */
export async function deleteUnit(unitId: number): Promise<void> {
  // Step 1: Request
  await api.delete(`/api/v1/units/${unitId}/`);
}