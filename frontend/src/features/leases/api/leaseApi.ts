// # Filename: src/features/leases/api/leaseApi.ts

import api from "../../../api/axios";

export type LeaseStatus = "draft" | "active" | "ended";

/**
 * LeasePartyRole
 *
 * Backend currently validates role choices.
 * Keep this permissive for now so the frontend does not drift
 * if backend role names expand later.
 */
export type LeasePartyRole = string;

/**
 * LeasePartyDetail
 *
 * Read-only tenant/party data returned by the backend.
 */
export type LeasePartyDetail = {
  id: number;
  role: LeasePartyRole;
  tenant: {
    id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
  };
};

/**
 * Lease
 *
 * Canonical lease resource returned from the backend.
 */
export type Lease = {
  id: number;
  unit: number; // FK id returned by backend
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  rent_amount: string; // DRF Decimal -> string
  security_deposit_amount: string | null; // DRF Decimal -> string|null
  rent_due_day: number;
  status: LeaseStatus;
  parties_detail: LeasePartyDetail[];
  created_at: string;
  updated_at: string;
};

/**
 * CreateLeasePartyInput
 *
 * Used when lease creation is launched from a tenant-aware workflow.
 *
 * Route usage:
 * - Unit-first route:
 *   user selects/creates tenant in form, then submit `parties`
 * - Tenant-first route:
 *   prefilled tenant should submit through `parties`
 * - Combined tenant+unit route:
 *   prefilled tenant should submit through `parties`
 * - Blank/manual route:
 *   selected tenant should submit through `parties`
 */
export type CreateLeasePartyInput = {
  tenant_id: number;
  role?: LeasePartyRole;
};

/**
 * CreateLeaseInput
 *
 * Shared create payload for all lease creation entry points.
 *
 * Important:
 * - `unit` is always required at submit time.
 * - tenant linkage is expressed through `parties`.
 *
 * Route mapping:
 * - Unit-first route:
 *   URL may prefill `unitId`, but submit still sends `unit`
 * - Tenant-first route:
 *   URL may prefill `tenantId`, but submit still must send selected `unit`
 *   and `parties`
 * - Combined route:
 *   submit sends both `unit` and `parties`
 * - Blank/manual route:
 *   user selects both, then submit sends both
 */
export type CreateLeaseInput = {
  unit: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  rent_amount: string; // send as string to preserve decimals
  security_deposit_amount?: string | null;
  rent_due_day?: number;
  status?: LeaseStatus;
  parties?: CreateLeasePartyInput[];
};

/**
 * UpdateLeaseInput
 *
 * Partial lease patch payload.
 *
 * Important:
 * - `unit` is intentionally immutable after create.
 * - tenant-party editing should be handled by a dedicated workflow later
 *   unless you explicitly choose to support it in PATCH.
 */
export type UpdateLeaseInput = Partial<
  Omit<CreateLeaseInput, "unit" | "parties">
> & {
  unit?: never;
  parties?: never;
};

type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

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
 * @param unitId Unit primary key
 * @returns Lease list for the given unit
 */
export async function listLeasesByUnit(unitId: number): Promise<Lease[]> {
  // Step 1: GET leases filtered by unit (org-scoped via axios headers)
  const res = await api.get<Lease[] | DRFPaginated<Lease>>("/api/v1/leases/", {
    params: { unit: unitId },
  });

  // Step 2: Normalize response shape
  return normalizeList(res.data);
}

/**
 * createLease
 *
 * Creates a new lease using the shared lease-create contract.
 *
 * Submit behavior by route:
 * - Unit-first:
 *   payload includes `unit` + lease terms + selected tenant in `parties`
 * - Tenant-first:
 *   payload includes selected `unit` + prefilled tenant in `parties`
 * - Combined:
 *   payload includes prefilled `unit` + prefilled tenant in `parties`
 * - Blank/manual:
 *   payload includes user-selected `unit` + user-selected tenant in `parties`
 *
 * @param payload Shared create payload
 * @returns Created lease resource
 */
export async function createLease(payload: CreateLeaseInput): Promise<Lease> {
  // Step 1: POST lease (org-scoped via axios headers)
  const res = await api.post<Lease>("/api/v1/leases/", payload);

  // Step 2: Return created lease resource
  return res.data;
}

/**
 * updateLease
 *
 * Partially updates a lease.
 *
 * Guarantees:
 * - Uses PATCH for partial updates.
 * - Does not allow changing `unit`.
 * - Does not allow changing `parties` through this generic patch route.
 * - Org scoping is enforced by backend + axios headers.
 *
 * @param leaseId Lease primary key
 * @param patch Partial lease update payload
 * @returns Updated lease resource
 */
export async function updateLease(
  leaseId: number,
  patch: UpdateLeaseInput
): Promise<Lease> {
  // Step 1: PATCH lease
  const res = await api.patch<Lease>(`/api/v1/leases/${leaseId}/`, patch);

  // Step 2: Return updated resource
  return res.data;
}