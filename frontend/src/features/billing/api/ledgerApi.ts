// # Filename: src/features/billing/api/ledgerApi.ts

import type { AxiosResponse } from "axios";

import type {
  BillingId,
  BillingApiErrorShape,
  LeaseLedgerResponse,
} from "./types";

/**
 * BillingGetClient
 *
 * Minimal axios-like contract required by this module.
 *
 * Why this exists:
 * We intentionally avoid hard-coding the shared axios client import path in
 * this file until we wire the hook layer. That keeps the module compile-safe
 * and makes the transport dependency explicit.
 */
export interface BillingGetClient {
  get<TResponse>(
    url: string,
    config?: {
      headers?: Record<string, string>;
      params?: Record<string, unknown>;
      signal?: AbortSignal;
    },
  ): Promise<AxiosResponse<TResponse>>;
}

/**
 * FetchLeaseLedgerParams
 *
 * Input contract for retrieving the lease ledger read model.
 */
export interface FetchLeaseLedgerParams {
  leaseId: BillingId;
  orgSlug?: string | null;
  signal?: AbortSignal;
}

/**
 * LedgerApi
 *
 * Public API surface returned by `createLedgerApi`.
 */
export interface LedgerApi {
  fetchLeaseLedger(
    params: FetchLeaseLedgerParams,
  ): Promise<LeaseLedgerResponse>;
}

/**
 * normalizeBillingId
 *
 * Converts a lease identifier into a safe path segment.
 *
 * @param leaseId - Raw lease identifier from route params or page state.
 * @returns A normalized lease id string.
 * @throws Error when the lease id is empty or invalid.
 */
function normalizeBillingId(leaseId: BillingId): string {
  const normalizedValue = String(leaseId).trim();

  if (!normalizedValue) {
    throw new Error("A valid leaseId is required to fetch the lease ledger.");
  }

  return normalizedValue;
}

/**
 * buildLeaseLedgerUrl
 *
 * Builds the lease-ledger endpoint path.
 *
 * Important:
 * We include the trailing slash to stay aligned with Django setups that
 * enforce `APPEND_SLASH` and canonical slash-terminated API routes.
 *
 * @param leaseId - Lease identifier used in the route path.
 * @returns Slash-terminated lease ledger endpoint path.
 */
export function buildLeaseLedgerUrl(leaseId: BillingId): string {
  const normalizedLeaseId = normalizeBillingId(leaseId);

  return `/api/v1/leases/${normalizedLeaseId}/ledger/`;
}

/**
 * buildOrgScopedHeaders
 *
 * Produces optional org-scoping headers for the request.
 *
 * Why this helper matters:
 * The shared axios client may already inject `X-Org-Slug`. If it does, this
 * helper simply adds the header again only when an org slug is supplied.
 * That keeps the API module usable in isolation without requiring every call
 * site to know the header details.
 *
 * @param orgSlug - Active organization slug when available.
 * @returns Optional request headers.
 */
function buildOrgScopedHeaders(
  orgSlug?: string | null,
): Record<string, string> | undefined {
  const trimmedOrgSlug = orgSlug?.trim();

  if (!trimmedOrgSlug) {
    return undefined;
  }

  return {
    "X-Org-Slug": trimmedOrgSlug,
  };
}

/**
 * isBillingApiErrorShape
 *
 * Lightweight runtime guard for narrowing known billing/API error envelopes.
 *
 * @param value - Unknown error payload.
 * @returns True when the payload looks like a supported billing API error.
 */
export function isBillingApiErrorShape(
  value: unknown,
): value is BillingApiErrorShape {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as BillingApiErrorShape;

  return Boolean(candidate.error || candidate.detail || candidate.message);
}

/**
 * fetchLeaseLedger
 *
 * Retrieves the full lease ledger read model from the backend.
 *
 * The backend contract for this endpoint is lease-scoped and is expected to
 * return the ledger payload used by the billing page, including charges,
 * payments, and totals. Later revisions may also include allocations and
 * richer lease-context metadata.
 *
 * @param client - Injected axios-like HTTP client.
 * @param params - Lease and request-scoping parameters.
 * @returns The typed lease ledger response payload.
 */
export async function fetchLeaseLedger(
  client: BillingGetClient,
  params: FetchLeaseLedgerParams,
): Promise<LeaseLedgerResponse> {
  const response = await client.get<LeaseLedgerResponse>(
    buildLeaseLedgerUrl(params.leaseId),
    {
      headers: buildOrgScopedHeaders(params.orgSlug),
      signal: params.signal,
    },
  );

  return response.data;
}

/**
 * createLedgerApi
 *
 * Factory that binds the injected HTTP client and returns the public ledger
 * API methods for the billing feature.
 *
 * This pattern keeps the module:
 * - easy to test
 * - easy to mock
 * - independent from a guessed shared-client import path
 * - ready for hook-level composition in the next build step
 *
 * @param client - Shared axios-like client for authenticated org-scoped API calls.
 * @returns Ledger API methods.
 */
export function createLedgerApi(client: BillingGetClient): LedgerApi {
  return {
    async fetchLeaseLedger(
      params: FetchLeaseLedgerParams,
    ): Promise<LeaseLedgerResponse> {
      return fetchLeaseLedger(client, params);
    },
  };
}

export default createLedgerApi;