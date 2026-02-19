// # Filename: src/api/leasesApi.ts


import api from "./axios";
import type { CreateLeasePayload, Lease, PaginatedResponse } from "../features/tenancy/types";

/**
 * Fetch leases for a specific unit.
 *
 * Endpoint:
 * - GET /api/v1/units/:unitId/leases/
 *
 * Notes:
 * - Today this likely returns Lease[]
 * - We still support paginated shape defensively: { results: Lease[] }
 */
export async function listUnitLeases(unitId: number): Promise<Lease[]> {
  // Step 1: Validate input early (developer-friendly error)
  if (!Number.isFinite(unitId) || unitId <= 0) {
    throw new Error(`listUnitLeases: invalid unitId "${unitId}"`);
    }

  // Step 2: Request
  const res = await api.get<Lease[] | PaginatedResponse<Lease>>(
    `/api/v1/units/${unitId}/leases/`
  );

  // Step 3: Robust response normalization
  const data: any = res.data;
  const results = data?.results ?? data;

  return (results ?? []) as Lease[];
}

/**
 * Create a lease (MVP: one primary tenant).
 *
 * Endpoint:
 * - POST /api/v1/leases/
 *
 * Backend expects "parties" as write-only references by tenant id:
 * - parties: [{ tenant: <id>, role: "primary" }]
 */
export async function createLease(payload: CreateLeasePayload): Promise<Lease> {
  // Step 1: Basic payload validation (fast feedback)
  if (!payload?.unit || payload.unit <= 0) {
    throw new Error("createLease: payload.unit is required and must be > 0");
  }

  if (!payload?.start_date) {
    throw new Error("createLease: payload.start_date is required");
  }

  if (!payload?.rent_amount) {
    throw new Error("createLease: payload.rent_amount is required");
  }

  if (!payload?.parties?.length) {
    throw new Error("createLease: payload.parties is required (MVP: one primary tenant)");
  }

  // Step 2: Request
  const res = await api.post<Lease>("/api/v1/leases/", payload);

  // Step 3: Return created lease
  return res.data;
}
