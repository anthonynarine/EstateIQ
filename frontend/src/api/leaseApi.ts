
// # Filename: src/api/leaseApi.ts

import { useQuery } from "@tanstack/react-query";
import api from "./axios";
import type { CreateLeasePayload, Lease, PaginatedResponse } from "../features/tenancy/types";

/**
 * Ledger line item shape (keep flexible as backend evolves).
 * We avoid over-tight typing until we confirm exact serializer keys.
 */
export type LeaseLedgerResponse = {
  lease_id: number;
  currency?: string;
  balance: number;
  unapplied_credit?: number;
  rows: Array<{
    id: number | string;
    date: string; // YYYY-MM-DD
    type: string; // charge | payment | credit | adjustment
    description?: string;
    amount: number; // signed or absolute depending on backend; UI can decide display
    applied_amount?: number;
    remaining_amount?: number;
    reference?: string;
  }>;
};

// -----------------------------
// # Step 1: Existing functions (keep as-is)
// -----------------------------

export async function listUnitLeases(unitId: number): Promise<Lease[]> {
  if (!Number.isFinite(unitId) || unitId <= 0) {
    throw new Error(`listUnitLeases: invalid unitId "${unitId}"`);
  }

  const res = await api.get<Lease[] | PaginatedResponse<Lease>>(`/api/v1/units/${unitId}/leases/`);
  const data: any = res.data;
  const results = data?.results ?? data;
  return (results ?? []) as Lease[];
}

export async function createLease(payload: CreateLeasePayload): Promise<Lease> {
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

  const res = await api.post<Lease>("/api/v1/leases/", payload);
  return res.data;
}

// -----------------------------
// # Step 2: Lease ledger API
// -----------------------------

export async function fetchLeaseLedger(leaseId: number): Promise<LeaseLedgerResponse> {
  if (!Number.isFinite(leaseId) || leaseId <= 0) {
    throw new Error(`fetchLeaseLedger: invalid leaseId "${leaseId}"`);
  }

  const res = await api.get<LeaseLedgerResponse>(`/api/v1/leases/${leaseId}/ledger/`);
  return res.data;
}

export async function generateLeaseChargesCurrentMonth(leaseId: number): Promise<{ ok: boolean }> {
  if (!Number.isFinite(leaseId) || leaseId <= 0) {
    throw new Error(`generateLeaseChargesCurrentMonth: invalid leaseId "${leaseId}"`);
  }

  const res = await api.post<{ ok: boolean }>(
    `/api/v1/leases/${leaseId}/charges/generate-current-month/`
  );
  return res.data;
}

// -----------------------------
// # Step 3: Org-safe query keys + hook
// -----------------------------

export const leaseQueryKeys = {
  leaseLedger: (orgSlug: string, leaseId: number) =>
    ["org", orgSlug, "leases", leaseId, "ledger"] as const,
};

export function useLeaseLedgerQuery(params: {
  orgSlug: string | null | undefined;
  leaseId: number;
}) {
  const { orgSlug, leaseId } = params;

  return useQuery({
    queryKey: orgSlug ? leaseQueryKeys.leaseLedger(orgSlug, leaseId) : ["org", "missing", "leases"],
    queryFn: () => fetchLeaseLedger(leaseId),
    enabled: Boolean(orgSlug) && Number.isFinite(leaseId) && leaseId > 0,
    staleTime: 10_000,
  });
}