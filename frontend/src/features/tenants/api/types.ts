// # Filename: src/features/tenants/api/types.ts
// ✅ New Code

/**
 * PaginatedResponse
 *
 * Standard page-number pagination envelope returned by DRF list endpoints.
 *
 * Why this matters:
 * - Keeps frontend contracts stable for search + pagination.
 * - Avoids flat-array assumptions in hooks and pages.
 * - Makes TanStack Query caching cleaner for directory-style screens.
 */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * TenantDirectoryBuildingSummary
 *
 * Minimal building data needed for the tenant directory.
 * We intentionally keep this lightweight for card rendering.
 */
export type TenantDirectoryBuildingSummary = {
  id: number;
  label: string;
};

/**
 * TenantDirectoryUnitSummary
 *
 * Minimal unit data needed for the tenant directory.
 */
export type TenantDirectoryUnitSummary = {
  id: number;
  label: string;
};

/**
 * TenantActiveLeaseSummary
 *
 * Derived operational data for the tenant directory.
 *
 * Important:
 * - This is NOT tenant-owned core data.
 * - It is lease-derived summary data returned by the list endpoint.
 * - Keeps the tenant model minimal while still powering the UI.
 */
export type TenantActiveLeaseSummary = {
  id: number;
  status: string;
  start_date: string | null;
  building: TenantDirectoryBuildingSummary | null;
  unit: TenantDirectoryUnitSummary | null;
};

/**
 * Tenant
 *
 * Stable tenant identity/contact record plus optional derived lease summary
 * for operational directory screens.
 *
 * Notes:
 * - `email` and `phone` remain nullable because the backend may allow
 *   either one as long as at least one contact method exists.
 * - `active_lease` is nullable because a tenant may exist before any lease
 *   is attached.
 * - Timestamps are ISO strings from the API.
 */
export type Tenant = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  active_lease: TenantActiveLeaseSummary | null;
  created_at: string;
  updated_at: string;
};

/**
 * TenantListParams
 *
 * Query params for the tenant directory list endpoint.
 *
 * Why this exists:
 * - Keeps query-hook signatures explicit.
 * - Prevents page/search drift across hooks and components.
 * - Makes URL state and API state line up cleanly.
 */
export type TenantListParams = {
  page?: number;
  page_size?: number;
  search?: string;
};

/**
 * CreateTenantInput
 *
 * Payload used when creating a new tenant.
 *
 * The backend should enforce:
 * - full_name is required
 * - at least one of email or phone is required
 */
export type CreateTenantInput = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * UpdateTenantInput
 *
 * PATCH payload used to partially update a tenant.
 * Partial keeps PATCH semantics explicit.
 */
export type UpdateTenantInput = Partial<CreateTenantInput>;