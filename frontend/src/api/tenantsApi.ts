// # Filename: src/api/tenantsApi.ts

import api from "./axios";
import type { PaginatedResponse, Tenant, CreateTenantPayload } from "../features/tenancy/types";

export type ListTenantsParams = {
  page?: number;
  pageSize?: number;
  ordering?: string; // "full_name" | "-created_at" etc.
  search?: string;
};

/**
 * Tenants API
 *
 * Multi-tenant rules:
 * - Authorization + X-Org-Slug are attached by your axios instance.
 *
 * DRF contract:
 * - GET /api/v1/tenants/ returns paginated:
 *   { count, next, previous, results }
 * - supports ordering:
 *   ?ordering=full_name or ?ordering=-created_at
 */
export async function listTenants(
  params: ListTenantsParams
): Promise<PaginatedResponse<Tenant>> {
  // Step 1: Build DRF pagination params
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 10,
  };

  // Step 2: Optional query params
  if (params.ordering) queryParams.ordering = params.ordering;
  if (params.search) queryParams.search = params.search;

  // Step 3: Request
  const res = await api.get<PaginatedResponse<Tenant>>("/api/v1/tenants/", {
    params: queryParams,
  });

  // Step 4: Return server payload (query hook normalizes/uses directly)
  return res.data;
}

/**
 * Create tenant
 *
 * Endpoint:
 * - POST /api/v1/tenants/
 */
export async function createTenant(payload: CreateTenantPayload): Promise<Tenant> {
  // Step 1: Validate required fields early (fast dev feedback)
  if (!payload?.full_name?.trim()) {
    throw new Error("createTenant: payload.full_name is required");
  }

  // Step 2: Request
  const res = await api.post<Tenant>("/api/v1/tenants/", {
    full_name: payload.full_name.trim(),
    email: payload.email ?? null,
    phone: payload.phone ?? null,
  });

  // Step 3: Return created tenant
  return res.data;
}
