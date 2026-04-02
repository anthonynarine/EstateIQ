// # Filename: src/features/billing/api/billingQueryKeys.ts

import type { BillingId, ISODateString } from "./billingTypes";

/**
 * BillingQueryKeysOptions
 *
 * Shared optional filters for billing reporting query keys.
 */
export interface BillingQueryKeysOptions {
  asOf?: ISODateString;
}

/**
 * normalizeOrgSlug
 *
 * Ensures the org slug portion of every billing query key is always a stable
 * string. This prevents accidental cache fragmentation caused by `undefined`,
 * empty strings, or inconsistent whitespace.
 *
 * @param orgSlug - Raw org slug from auth or tenancy context.
 * @returns A normalized org slug safe for TanStack Query keys.
 */
function normalizeOrgSlug(orgSlug: string | null | undefined): string {
  const trimmedOrgSlug = orgSlug?.trim();

  if (!trimmedOrgSlug) {
    return "unknown-org";
  }

  return trimmedOrgSlug;
}

/**
 * normalizeBillingId
 *
 * Converts an optional billing identifier into a stable query-key-safe value.
 *
 * Why this matters:
 * TanStack Query keys should remain deterministic. Using a consistent fallback
 * avoids keys like `undefined`, `null`, or accidental empty strings drifting
 * across the cache.
 *
 * @param value - A billing-domain identifier such as a lease id.
 * @returns A stable identifier string or number for query keys.
 */
function normalizeBillingId(
  value: BillingId | null | undefined,
): BillingId | "unknown-id" {
  if (value === null || value === undefined || value === "") {
    return "unknown-id";
  }

  return value;
}

/**
 * billingQueryKeys
 *
 * Centralized TanStack Query keys for the billing feature.
 *
 * Design rules:
 * - every key is org-scoped
 * - lease-specific keys include the lease id
 * - reporting keys include stable filter objects only when needed
 * - pages and hooks should consume these helpers instead of inlining arrays
 *
 * Pattern:
 * `["org", orgSlug, "billing", ...]`
 */
export const billingQueryKeys = {
  /**
   * all
   *
   * Top-level namespace for all billing queries in the current organization.
   *
   * @param orgSlug - Active organization slug.
   * @returns Root billing query key.
   */
  all(orgSlug: string) {
    return ["org", normalizeOrgSlug(orgSlug), "billing"] as const;
  },

  /**
   * dashboard
   *
   * Namespace for billing dashboard summary queries.
   *
   * @param orgSlug - Active organization slug.
   * @returns Billing dashboard namespace key.
   */
  dashboard(orgSlug: string) {
    return [...this.all(orgSlug), "dashboard"] as const;
  },

  /**
   * dashboardSummary
   *
   * Query key for the billing dashboard summary card payload.
   *
   * @param orgSlug - Active organization slug.
   * @param options - Optional reporting filters such as `asOf`.
   * @returns Dashboard summary query key.
   */
  dashboardSummary(orgSlug: string, options?: BillingQueryKeysOptions) {
    return [
      ...this.dashboard(orgSlug),
      "summary",
      {
        asOf: options?.asOf ?? null,
      },
    ] as const;
  },

  /**
   * ledgers
   *
   * Namespace for lease-ledger-specific queries.
   *
   * @param orgSlug - Active organization slug.
   * @returns Lease ledger namespace key.
   */
  ledgers(orgSlug: string) {
    return [...this.all(orgSlug), "ledgers"] as const;
  },

  /**
   * leaseLedger
   *
   * Query key for the primary lease ledger payload.
   *
   * @param orgSlug - Active organization slug.
   * @param leaseId - Lease identifier from the route or page state.
   * @returns Lease ledger query key.
   */
  leaseLedger(orgSlug: string, leaseId: BillingId) {
    return [
      ...this.ledgers(orgSlug),
      normalizeBillingId(leaseId),
    ] as const;
  },

  /**
   * reports
   *
   * Namespace for org-level billing reporting endpoints.
   *
   * @param orgSlug - Active organization slug.
   * @returns Billing reporting namespace key.
   */
  reports(orgSlug: string) {
    return [...this.all(orgSlug), "reports"] as const;
  },

  /**
   * delinquency
   *
   * Query key for the org-level delinquency report.
   *
   * @param orgSlug - Active organization slug.
   * @param options - Required or optional reporting filters.
   * @returns Delinquency report query key.
   */
  delinquency(orgSlug: string, options?: BillingQueryKeysOptions) {
    return [
      ...this.reports(orgSlug),
      "delinquency",
      {
        asOf: options?.asOf ?? null,
      },
    ] as const;
  },

  /**
   * workbench
   *
   * Reserved namespace for future billing workbench queries such as:
   * - missing rent charges
   * - unapplied payments
   * - due soon
   * - overdue queues
   *
   * @param orgSlug - Active organization slug.
   * @returns Billing workbench namespace key.
   */
  workbench(orgSlug: string) {
    return [...this.all(orgSlug), "workbench"] as const;
  },
} as const;

export default billingQueryKeys;