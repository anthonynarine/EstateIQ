// # Filename: src/api/tenantsApi.ts
// ✅ New Code

import api from "./axios";
import type { CreateTenantPayload, PaginatedResponse, Tenant } from "../features/tenancy/types";

export type ListTenantsParams = {
  page?: number;
  pageSize?: number;
  ordering?: string; // "full_name" | "-created_at" etc.
  search?: string;
};

/**
 * List tenants (paginated).
 *
 * Endpoint:
 * - GET /api/v1/tenants/
 *
 * Backend contract:
 * - Returns { count, next, previous, results }
 * - Supports ordering via ?ordering=full_name or ?ordering=-created_at
 *
 * Note:
 * - Your axios instance attaches Authorization + X-Org-Slug automatically.
 */
export async function listTenants(params: ListTenantsParams) {
  // Step 1: Build query params (DRF pagination uses page + page_size)
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 10,
  };

  if (params.ordering) queryParams.ordering = params.ordering;
  if (params.search) queryParams.search = params.search;

  // Step 2: Request
  const res = await api.get<PaginatedResponse<Tenant>>("/api/v1/tenants/", {
    params: queryParams,
  });

  // Step 3: Return server data (query hooks normalize if needed)
  return res.data;
}

/**
 * Create a tenant.
 *
 * Endpoint:
 * - POST /api/v1/tenants/
 */
export async function createTenant(payload: CreateTenantPayload): Promise<Tenant> {
  // Step 1: Validate required field early (developer-friendly)
  if (!payload?.full_name?.trim()) {
    throw new Error("createTenant: payload.full_name is required");
  }

  // Step 2: Request
  const res = await api.post<Tenant>("/api/v1/tenants/", payload);

  // Step 3: Return created tenant
  return res.data;
}
