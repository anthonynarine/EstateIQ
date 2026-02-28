// # Filename: src/features/leases/api/leasesApi.ts

import api from "../../../api/axios";

export type LeaseStatus = "draft" | "active" | "ended";

export type LeasePartyDetail = {
  id: number;
  role: string;
  tenant: {
    id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type Lease = {
  id: number;
  unit: number; // backend returns unit id (FK)
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

export type CreateLeaseInput = {
  unit: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  rent_amount: string; // send as string to preserve decimals
  security_deposit_amount?: string | null;
  rent_due_day?: number;
  status?: LeaseStatus;
  // parties optional for now — we can attach tenants later
};


export type UpdateLeaseInput = Partial<
  Omit<CreateLeaseInput, "unit">
> & {
  /**
   * unit is intentionally NOT supported in updates from the UI.
   * Lease → Unit relationship should be immutable after create.
   */
  unit?: never;
};

type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function normalizeList<T>(data: T[] | DRFPaginated<T>): T[] {
  // Step 1: Support both paginated and non-paginated DRF responses
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export async function listLeasesByUnit(unitId: number): Promise<Lease[]> {
  // Step 1: GET leases filtered by unit (org-scoped via axios headers)
  const res = await api.get<Lease[] | DRFPaginated<Lease>>("/api/v1/leases/", {
    params: { unit: unitId },
  });
  return normalizeList(res.data);
}

export async function createLease(payload: CreateLeaseInput): Promise<Lease> {
  // Step 1: POST lease (org-scoped via axios headers)
  const res = await api.post<Lease>("/api/v1/leases/", payload);
  return res.data;
}


/**
 * updateLease
 *
 * Partially updates a lease (PATCH).
 *
 * Enterprise guarantees:
 * - Uses PATCH for partial updates (no need to send entire resource).
 * - Disallows changing `unit` from UI (immutable relationship).
 * - Org scoping is enforced by backend + axios headers (Authorization + X-Org-Slug).
 *
 * @param leaseId - Lease primary key
 * @param patch - Partial lease update payload
 */
export async function updateLease(
  leaseId: number,
  patch: UpdateLeaseInput
): Promise<Lease> {
  // Step 1: PATCH lease
  const res = await api.patch<Lease>(`/api/v1/leases/${leaseId}/`, patch);
  return res.data;
}