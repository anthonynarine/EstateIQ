// # Filename: src/features/buildings/api/buildingsApi.ts


import api from "../../../api/axios";

/**
 * Building
 *
 * Canonical Building type returned by the backend.
 * Includes read-only aggregates used in the UI.
 */
export type Building = {
  id: number;
  name: string;
  building_type: string;
  country: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;

  // Read-only aggregates (serializer)
  units_count?: number;
  occupied_units_count?: number;
  vacant_units_count?: number;

  created_at?: string;
  updated_at?: string;
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

export type CreateBuildingInput = {
  name: string;
  building_type?: string;
  country?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
};

export type UpdateBuildingInput = Partial<CreateBuildingInput>;

export type ListBuildingsParams = {
  orgSlug: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
};

/**
 * normalizePaginatedResponse
 *
 * Ensures the buildings list always returns a stable paginated shape.
 *
 * Why this exists:
 * - The backend should now return DRF pagination metadata.
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
 * listBuildings
 *
 * Returns a paginated buildings collection for the active org.
 *
 * Query params:
 * - page
 * - page_size
 * - ordering (optional)
 *
 * Expected backend response:
 * {
 *   count: number,
 *   next: string | null,
 *   previous: string | null,
 *   results: Building[]
 * }
 */
export async function listBuildings({
  orgSlug,
  page = 1,
  pageSize = 6,
  ordering,
}: ListBuildingsParams): Promise<PaginatedResponse<Building>> {
  const res = await api.get<PaginatedResponse<Building> | Building[]>(
    "/api/v1/buildings/",
    {
      headers: { "X-Org-Slug": orgSlug },
      params: {
        page,
        page_size: pageSize,
        ...(ordering ? { ordering } : {}),
      },
    }
  );

  return normalizePaginatedResponse<Building>(res.data);
}

/**
 * getBuilding
 *
 * Retrieve a single building (org-scoped).
 */
export async function getBuilding(
  orgSlug: string,
  buildingId: number
): Promise<Building> {
  const res = await api.get<Building>(`/api/v1/buildings/${buildingId}/`, {
    headers: { "X-Org-Slug": orgSlug },
  });

  return res.data;
}

/**
 * createBuilding
 *
 * Creates a building scoped to org.
 */
export async function createBuilding(
  orgSlug: string,
  payload: CreateBuildingInput
): Promise<Building> {
  const res = await api.post<Building>("/api/v1/buildings/", payload, {
    headers: { "X-Org-Slug": orgSlug },
  });

  return res.data;
}

/**
 * updateBuilding
 *
 * PATCH update (org-scoped).
 */
export async function updateBuilding(
  orgSlug: string,
  buildingId: number,
  payload: UpdateBuildingInput
): Promise<Building> {
  const res = await api.patch<Building>(
    `/api/v1/buildings/${buildingId}/`,
    payload,
    {
      headers: { "X-Org-Slug": orgSlug },
    }
  );

  return res.data;
}

/**
 * deleteBuilding
 *
 * Hard delete (org-scoped).
 */
export async function deleteBuilding(
  orgSlug: string,
  buildingId: number
): Promise<void> {
  await api.delete(`/api/v1/buildings/${buildingId}/`, {
    headers: { "X-Org-Slug": orgSlug },
  });
}