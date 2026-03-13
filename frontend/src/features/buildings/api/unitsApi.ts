// # Filename: src/features/buildings/api/unitsApi.ts
// ✅ New Code

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

  // Step 1: Occupancy fields (computed server-side)
  is_occupied: boolean;
  active_lease_id: number | null;

  // Step 2: Active lease + tenant summary fields
  active_lease_end_date: string | null;
  active_tenant_id: number | null;
  active_tenant_name: string | null;

  created_at: string;
  updated_at: string;
};

/**
 * PaginatedResponse
 *
 * Standard DRF page-number pagination envelope used by list endpoints.
 */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * ListUnitsByBuildingParams
 *
 * Params for listing units scoped to a single building.
 */
export type ListUnitsByBuildingParams = {
  buildingId: number;
  page?: number;
  pageSize?: number;
  ordering?: string;
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
 * normalizePaginatedResponse
 *
 * Ensures the units list always returns a stable paginated shape.
 *
 * Why this exists:
 * - The backend should return DRF pagination metadata.
 * - This guard protects the frontend from malformed or unexpected payloads.
 * - We intentionally do NOT flatten the response to an array because the UI
 *   needs count/next/previous for real pagination controls.
 */
function normalizePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
  // Step 1: DRF paginated payload
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    const typed = data as Partial<PaginatedResponse<T>>;

    return {
      count: typeof typed.count === "number" ? typed.count : 0,
      next: typed.next ?? null,
      previous: typed.previous ?? null,
      results: Array.isArray(typed.results) ? typed.results : [],
    };
  }

  // Step 2: Legacy/plain-list fallback
  // This keeps the frontend from exploding if a non-paginated response slips through.
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data as T[],
    };
  }

  // Step 3: Fail-safe empty payload
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}

/**
 * listUnitsByBuilding
 *
 * Returns a paginated units collection for a single building.
 *
 * Endpoint:
 * - GET /api/v1/units/?building=<buildingId>&page=<page>&page_size=<pageSize>
 */
export async function listUnitsByBuilding({
  buildingId,
  page = 1,
  pageSize = 6,
  ordering,
}: ListUnitsByBuildingParams): Promise<PaginatedResponse<Unit>> {
  const res = await api.get<PaginatedResponse<Unit> | Unit[]>("/api/v1/units/", {
    params: {
      building: buildingId,
      page,
      page_size: pageSize,
      ...(ordering ? { ordering } : {}),
    },
  });

  // Step 1: Inspect raw API response
  console.log("DEBUG - unitsApi raw response:", res.data);
  return normalizePaginatedResponse<Unit>(res.data);
}

/**
 * createUnit
 *
 * Endpoint:
 * - POST /api/v1/units/
 */
export async function createUnit(payload: CreateUnitInput): Promise<Unit> {
  const res = await api.post<Unit>("/api/v1/units/", payload);
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
  const res = await api.patch<Unit>(`/api/v1/units/${unitId}/`, payload);
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
  await api.delete(`/api/v1/units/${unitId}/`);
}