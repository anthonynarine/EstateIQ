// # Filename: src/features/tenants/utils/tenantQueryKeys.ts


/**
 * TenantListQueryKeyParams
 *
 * Canonical input contract for tenant list query keys.
 */
export type TenantListQueryKeyParams = {
  orgSlug: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

/**
 * tenantQueryKeys
 *
 * Centralized query key factory for the Tenants feature.
 *
 * Why this exists:
 * - Keeps cache keys deterministic and org-scoped.
 * - Prevents query key drift across hooks and mutations.
 * - Makes invalidation rules easier to reason about.
 */
export const tenantQueryKeys = {
  /**
   * all
   *
   * Top-level tenant namespace.
   */
  all: ["tenants"] as const,

  /**
   * org
   *
   * Org-scoped tenant namespace.
   */
  org: (orgSlug: string) => ["org", orgSlug, "tenants"] as const,

  /**
   * list
   *
   * Canonical paginated/searchable tenant directory key.
   */
  list: ({
    orgSlug,
    page = 1,
    pageSize = 12,
    search = "",
  }: TenantListQueryKeyParams) =>
    [
      "org",
      orgSlug,
      "tenants",
      {
        page,
        pageSize,
        search: search.trim(),
      },
    ] as const,

  /**
   * detail
   *
   * Future-safe tenant detail key.
   */
  detail: (orgSlug: string, tenantId: number) =>
    ["org", orgSlug, "tenants", "detail", tenantId] as const,
};