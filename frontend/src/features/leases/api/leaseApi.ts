// # Filename: src/features/leases/api/leaseApi.ts

import api from "../../../api/axios";
import type {
  CreateLeaseInput,
  DRFPaginated,
  Lease,
  UpdateLeaseInput,
} from "./types";

/**
 * normalizeList
 *
 * Normalizes DRF paginated and non-paginated list responses.
 *
 * @param data Raw API response payload
 * @returns Flat array of records
 */
function normalizeList<T>(data: T[] | DRFPaginated<T>): T[] {
  // Step 1: Support both paginated and non-paginated DRF responses
  if (Array.isArray(data)) {
    return data;
  }

  // Step 2: Fallback to paginated result shape
  return data.results ?? [];
}

/**
 * listLeasesByUnit
 *
 * Fetches leases for a specific unit.
 *
 * Org scoping:
 * - Organization scoping is handled by the shared axios instance/headers.
 *
 * @param unitId Unit primary key
 * @returns Lease list for the given unit
 */
export async function listLeasesByUnit(unitId: number): Promise<Lease[]> {
  // Step 1: GET leases filtered by unit
  const res = await api.get<Lease[] | DRFPaginated<Lease>>("/api/v1/leases/", {
    params: { unit: unitId },
  });

  // Step 2: Normalize response shape
  return normalizeList(res.data);
}

/**
 * getLease
 *
 * Fetch a single lease by id.
 *
 * @param leaseId Lease primary key
 * @returns Lease detail resource
 */
export async function getLease(leaseId: number): Promise<Lease> {
  // Step 1: GET lease detail
  const res = await api.get<Lease>(`/api/v1/leases/${leaseId}/`);

  // Step 2: Return lease resource
  return res.data;
}

/**
 * createLease
 *
 * Creates a new lease.
 *
 * Important:
 * - Backend now requires a valid primary tenant relationship.
 * - Frontend should always submit:
 *   parties: [{ tenant_id, role: "primary" }]
 *
 * @param payload Shared create payload
 * @returns Created lease resource
 */
export async function createLease(payload: CreateLeaseInput): Promise<Lease> {
  // Step 1: POST lease create payload
  const res = await api.post<Lease>("/api/v1/leases/", payload);

  // Step 2: Return created lease
  return res.data;
}

/**
 * updateLease
 *
 * Partially updates a lease.
 *
 * Important:
 * - Backend now supports authoritative party syncing on PATCH.
 * - Send `parties` when changing or repairing the primary tenant link.
 *
 * @param leaseId Lease primary key
 * @param patch Partial lease update payload
 * @returns Updated lease resource
 */
export async function updateLease(
  leaseId: number,
  patch: UpdateLeaseInput
): Promise<Lease> {
  // Step 1: PATCH lease payload
  const res = await api.patch<Lease>(`/api/v1/leases/${leaseId}/`, patch);

  // Step 2: Return updated lease
  return res.data;
}

/**
 * endLease
 *
 * Ends a lease using the dedicated backend action endpoint.
 *
 * @param leaseId Lease primary key
 * @param endDate Move-out date in YYYY-MM-DD format
 * @returns Updated lease resource
 */
export async function endLease(
  leaseId: number,
  endDate: string
): Promise<Lease> {
  // Step 1: POST end date to lease end action
  const res = await api.post<Lease>(`/api/v1/leases/${leaseId}/end/`, {
    end_date: endDate,
  });

  // Step 2: Return ended lease
  return res.data;
}