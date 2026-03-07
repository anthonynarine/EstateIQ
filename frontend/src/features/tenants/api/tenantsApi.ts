// # Filename: src/features/tenants/api/tenantsApi.ts
// ✅ New Code

import api from "../../../api/axios";
import type {
  CreateTenantInput,
  PaginatedResponse,
  Tenant,
  TenantListParams,
  UpdateTenantInput,
} from "./types";

/**
 * buildTenantListParams
 *
 * Builds a clean query param object for the tenant list endpoint.
 *
 * Why this helper exists:
 * - Keeps org scoping mandatory and centralized.
 * - Prevents undefined/empty query noise from leaking into requests.
 * - Makes future filtering additions safer.
 */
function buildTenantListParams(orgSlug: string, params?: TenantListParams) {
  // Step 1: Start with required org scope
  const queryParams: Record<string, string | number> = {
    org: orgSlug,
  };

  // Step 2: Add page when provided
  if (typeof params?.page === "number" && params.page > 0) {
    queryParams.page = params.page;
  }

  // Step 3: Add page_size when provided
  if (typeof params?.page_size === "number" && params.page_size > 0) {
    queryParams.page_size = params.page_size;
  }

  // Step 4: Add trimmed search when provided
  if (typeof params?.search === "string") {
    const trimmedSearch = params.search.trim();

    if (trimmedSearch) {
      queryParams.search = trimmedSearch;
    }
  }

  return { params: queryParams };
}

/**
 * withOrg
 *
 * Simple helper for non-list endpoints that only require org scoping.
 */
function withOrg(orgSlug: string) {
  return {
    params: {
      org: orgSlug,
    },
  };
}

/**
 * listTenants
 *
 * Fetches the org-scoped tenant directory using page-number pagination.
 *
 * Expected backend response shape:
 * {
 *   count: number,
 *   next: string | null,
 *   previous: string | null,
 *   results: Tenant[]
 * }
 */
export async function listTenants(
  orgSlug: string,
  params?: TenantListParams
): Promise<PaginatedResponse<Tenant>> {
  // Step 1: GET /api/v1/tenants/?org=<slug>&page=1&page_size=12&search=john
  const res = await api.get<PaginatedResponse<Tenant>>(
    "/api/v1/tenants/",
    buildTenantListParams(orgSlug, params)
  );

  return res.data;
}

/**
 * createTenant
 *
 * Creates a new tenant within the current organization.
 */
export async function createTenant(
  orgSlug: string,
  payload: CreateTenantInput
): Promise<Tenant> {
  // Step 1: POST /api/v1/tenants/?org=<slug>
  const res = await api.post<Tenant>(
    "/api/v1/tenants/",
    payload,
    withOrg(orgSlug)
  );

  return res.data;
}

/**
 * updateTenant
 *
 * Partially updates an existing tenant within the current organization.
 */
export async function updateTenant(
  orgSlug: string,
  tenantId: number,
  payload: UpdateTenantInput
): Promise<Tenant> {
  // Step 1: PATCH /api/v1/tenants/:id/?org=<slug>
  const res = await api.patch<Tenant>(
    `/api/v1/tenants/${tenantId}/`,
    payload,
    withOrg(orgSlug)
  );

  return res.data;
}