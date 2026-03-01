// # Filename: src/features/tenants/api/tenantsApi.ts


import api from "../../../api/axios"; 
import type { CreateTenantInput, Tenant, UpdateTenantInput } from "./types";

/**
 * tenantsApi
 *
 * Thin HTTP client for the Tenants feature.
 *
 * IMPORTANT:
 * - Uses the app-wide authenticated axios instance (src/api/axios.ts).
 * - This ensures:
 *   - Authorization header injection
 *   - Org header injection
 *   - refresh-on-401 behavior
 *
 * Org scoping:
 * - We keep `?org=<slug>` for consistency with the rest of the app.
 */

function withOrg(orgSlug: string) {
  return { params: { org: orgSlug } };
}

export async function listTenants(orgSlug: string): Promise<Tenant[]> {
  // Step 1: GET /api/v1/tenants/?org=<slug>
  const res = await api.get<{ results: Tenant[] }>("/api/v1/tenants/", withOrg(orgSlug));
  return res.data.results;
}

export async function createTenant(
  orgSlug: string,
  payload: CreateTenantInput
): Promise<Tenant> {
  // Step 1: POST /api/v1/tenants/?org=<slug>
  const res = await api.post<Tenant>("/api/v1/tenants/", payload, withOrg(orgSlug));
  return res.data;
}

export async function updateTenant(
  orgSlug: string,
  tenantId: number,
  payload: UpdateTenantInput
): Promise<Tenant> {
  // Step 1: PATCH /api/v1/tenants/:id/?org=<slug>
  const res = await api.patch<Tenant>(`/api/v1/tenants/${tenantId}/`, payload, withOrg(orgSlug));
  return res.data;
}