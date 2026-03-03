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

/**
 * listBuildings
 *
 * Returns all buildings for the active org.
 */
export async function listBuildings(orgSlug: string): Promise<Building[]> {
  // Step 1: Org-scoped request
  const res = await api.get<Building[]>("/api/v1/buildings/", {
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
  buildingId: number,
  payload: UpdateBuildingInput
): Promise<Building> {
  const res = await api.patch<Building>(`/api/v1/buildings/${buildingId}/`, payload);
  return res.data;
}

/**
 * deleteBuilding
 *
 * Hard delete (org-scoped via auth + org middleware).
 */
export async function deleteBuilding(buildingId: number): Promise<void> {
  await api.delete(`/api/v1/buildings/${buildingId}/`);
}


export async function getBuilding(
  orgSlug: string,
  buildingId: number
): Promise<Building> {
  // Step 1: Org-scoped request
  const res = await api.get<Building>(`/api/v1/buildings/${buildingId}/`, {
    headers: { "X-Org-Slug": orgSlug },
  });

  return res.data;
}