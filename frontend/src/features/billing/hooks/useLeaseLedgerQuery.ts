// # Filename: src/features/billing/hooks/useLeaseLedgerQuery.ts


import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import api from "../../../api/axios";

import billingQueryKeys from "../api/billingQueryKeys";
import createLedgerApi from "../api/ledgerApi";
import type {
  BillingApiErrorShape,
  BillingId,
  LeaseLedgerResponse,
} from "../api/billingTypes";

/**
 * UseLeaseLedgerQueryParams
 *
 * Input contract for the lease-ledger query hook.
 *
 * We keep `orgSlug` optional for now because the billing page may not yet be
 * wired to the final tenancy context hook. This lets the billing feature be
 * built incrementally without coupling the query layer to unfinished context
 * utilities.
 */
export interface UseLeaseLedgerQueryParams {
  leaseId: BillingId | null | undefined;
  orgSlug?: string | null;
  enabled?: boolean;
}

/**
 * normalizeLeaseId
 *
 * Converts a raw lease id into a stable query-safe value.
 *
 * @param leaseId - Route or caller-provided lease identifier.
 * @returns A normalized billing id or null when the input is invalid.
 */
function normalizeLeaseId(leaseId: BillingId | null | undefined): BillingId | null {
  if (leaseId === null || leaseId === undefined) {
    return null;
  }

  const normalizedValue = String(leaseId).trim();

  if (!normalizedValue) {
    return null;
  }

  return leaseId;
}

/**
 * normalizeOrgSlug
 *
 * Produces a stable optional org slug value for downstream API calls.
 *
 * @param orgSlug - Caller-provided organization slug.
 * @returns A trimmed org slug or undefined when empty.
 */
function normalizeOrgSlug(orgSlug?: string | null): string | undefined {
  const trimmedOrgSlug = orgSlug?.trim();

  if (!trimmedOrgSlug) {
    return undefined;
  }

  return trimmedOrgSlug;
}

/**
 * useLeaseLedgerQuery
 *
 * Primary TanStack Query hook for the lease ledger page.
 *
 * Responsibilities:
 * - generate a stable org-scoped billing query key
 * - call the centralized ledger API module
 * - keep query orchestration out of the page component
 * - rely on backend-derived ledger truth instead of browser-side math
 *
 * Important architectural boundary:
 * - The backend remains the source of truth for charges, payments,
 *   allocations, and balance totals.
 * - This hook only retrieves and caches the read model.
 *
 * @param params - Lease and org-scoping inputs for the query.
 * @returns TanStack Query result containing the lease ledger payload.
 */
export function useLeaseLedgerQuery({
  leaseId,
  orgSlug,
  enabled = true,
}: UseLeaseLedgerQueryParams): UseQueryResult<
  LeaseLedgerResponse,
  BillingApiErrorShape | Error
> {
  const normalizedLeaseId = useMemo(() => {
    return normalizeLeaseId(leaseId);
  }, [leaseId]);

  const normalizedOrgSlug = useMemo(() => {
    return normalizeOrgSlug(orgSlug);
  }, [orgSlug]);

  const ledgerApi = useMemo(() => {
    return createLedgerApi(api);
  }, []);

  const isQueryEnabled = enabled && Boolean(normalizedLeaseId);

  return useQuery<LeaseLedgerResponse, BillingApiErrorShape | Error>({
    queryKey: billingQueryKeys.leaseLedger(
      normalizedOrgSlug ?? "unknown-org",
      normalizedLeaseId ?? "unknown-id",
    ),
    queryFn: async ({ signal }) => {
      if (!normalizedLeaseId) {
        throw new Error("A valid leaseId is required to load the lease ledger.");
      }

      return ledgerApi.fetchLeaseLedger({
        leaseId: normalizedLeaseId,
        orgSlug: normalizedOrgSlug,
        signal,
      });
    },
    enabled: isQueryEnabled,
  });
}

export default useLeaseLedgerQuery;