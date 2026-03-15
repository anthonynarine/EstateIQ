// # Filename: src/features/tenants/api/types.ts


/**
 * PaginatedResponse
 *
 * Standard page-number pagination envelope returned by DRF list endpoints.
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
 */
export type TenantDirectoryBuildingSummary = {
  id: number | null;
  label: string | null;
};

/**
 * TenantDirectoryUnitSummary
 *
 * Minimal unit data needed for the tenant directory.
 */
export type TenantDirectoryUnitSummary = {
  id: number | null;
  label: string | null;
};

/**
 * TenantActiveLeaseSummary
 *
 * Lease-derived operational data for the tenant directory.
 */
export type TenantActiveLeaseSummary = {
  id: number;
  status: string;
  start_date: string | null;
  building: TenantDirectoryBuildingSummary | null;
  unit: TenantDirectoryUnitSummary | null;
};

/**
 * TenantOccupancyStatus
 *
 * Lightweight derived occupancy state from lease relationships.
 */
export type TenantOccupancyStatus = "active" | "former";

/**
 * Tenant
 *
 * Tenant directory read model.
 */
export type Tenant = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  occupancy_status: TenantOccupancyStatus;
  active_lease: TenantActiveLeaseSummary | null;
  created_at: string;
  updated_at: string;
};

/**
 * TenantResidenceSummary
 *
 * Richer residence data for the tenant detail view.
 */
export type TenantResidenceSummary = {
  lease_id: number;
  building_id: number | null;
  building_name: string | null;
  unit_id: number | null;
  unit_label: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  rent_amount: string | null;
  role: string;
};

/**
 * TenantLeaseHistoryItem
 *
 * Alias for tenant detail readability.
 */
export type TenantLeaseHistoryItem = TenantResidenceSummary;

/**
 * TenantDetail
 *
 * Enriched tenant detail read model.
 */
export type TenantDetail = Tenant & {
  current_residence: TenantResidenceSummary | null;
  lease_history: TenantLeaseHistoryItem[];
};

/**
 * TenantWriteResponse
 *
 * Lean write response returned by create/update actions.
 *
 * Important:
 * - Do not assume write responses include the full directory/detail read model.
 * - Read-model fields should come from refetched queries after invalidation.
 */
export type TenantWriteResponse = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * TenantListParams
 *
 * Query params for the tenant directory list endpoint.
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
 */
export type UpdateTenantInput = Partial<CreateTenantInput>;