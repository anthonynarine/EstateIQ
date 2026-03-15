// # Filename: src/features/tenants/api/tenantsApi.ts

import api from "../../../api/axios";
import type {
  CreateTenantInput,
  PaginatedResponse,
  Tenant,
  TenantDetail,
  TenantListParams,
  TenantWriteResponse,
  UpdateTenantInput,
} from "./types";

/**
 * buildTenantListParams
 *
 * Builds a clean query param object for the tenant list endpoint.
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
 * Simple helper for org-scoped non-list endpoints.
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
 */
export async function listTenants(
  orgSlug: string,
  params?: TenantListParams
): Promise<PaginatedResponse<Tenant>> {
  // Step 1: Fetch the paginated tenant list
  const res = await api.get<PaginatedResponse<Tenant>>(
    "/api/v1/tenants/",
    buildTenantListParams(orgSlug, params)
  );

  return res.data;
}

/**
 * getTenantById
 *
 * Fetches a single enriched tenant detail record.
 */
export async function getTenantById(
  orgSlug: string,
  tenantId: number
): Promise<TenantDetail> {
  // Step 1: Fetch the tenant detail payload
  const res = await api.get<TenantDetail>(
    `/api/v1/tenants/${tenantId}/`,
    withOrg(orgSlug)
  );

  return res.data;
}

/**
 * createTenant
 *
 * Creates a new tenant in the current organization.
 *
 * Important:
 * - This returns the lean write response.
 * - The full directory/detail read model should be refreshed via invalidated queries.
 */
export async function createTenant(
  orgSlug: string,
  payload: CreateTenantInput
): Promise<TenantWriteResponse> {
  // Step 1: Create the tenant
  const res = await api.post<TenantWriteResponse>(
    "/api/v1/tenants/",
    payload,
    withOrg(orgSlug)
  );

  return res.data;
}

/**
 * updateTenant
 *
 * Partially updates an existing tenant in the current organization.
 *
 * Important:
 * - This returns the lean write response.
 * - The full read model should come from refetched queries.
 */
export async function updateTenant(
  orgSlug: string,
  tenantId: number,
  payload: UpdateTenantInput
): Promise<TenantWriteResponse> {
  // Step 1: Patch the tenant
  const res = await api.patch<TenantWriteResponse>(
    `/api/v1/tenants/${tenantId}/`,
    payload,
    withOrg(orgSlug)
  );

  return res.data;
}