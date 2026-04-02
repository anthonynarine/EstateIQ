// # Filename: src/features/billing/api/billingReportingApi.ts


import type { AxiosResponse } from "axios";

import type {
  BillingApiErrorShape,
  BillingDashboardSummary,
  BillingDashboardSummaryQueryParams,
  DelinquencyQueryParams,
  DelinquencyReportResponse,
} from "./billingTypes";

/**
 * BillingGetClient
 *
 * Minimal axios-like GET contract required by the billing reporting API.
 *
 * This keeps the module easy to test and avoids tightly coupling the
 * reporting layer to one specific axios instance implementation.
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
 * FetchDelinquencyReportParams
 *
 * Input contract for fetching the org-level delinquency report.
 */
export interface FetchDelinquencyReportParams {
  query: DelinquencyQueryParams;
  orgSlug?: string | null;
  signal?: AbortSignal;
}

/**
 * FetchBillingDashboardSummaryParams
 *
 * Input contract for fetching the billing dashboard summary payload.
 */
export interface FetchBillingDashboardSummaryParams {
  query?: BillingDashboardSummaryQueryParams;
  orgSlug?: string | null;
  signal?: AbortSignal;
}

/**
 * BillingReportingApi
 *
 * Public API surface returned by `createBillingReportingApi`.
 */
export interface BillingReportingApi {
  fetchDelinquencyReport(
    params: FetchDelinquencyReportParams,
  ): Promise<DelinquencyReportResponse>;
  fetchBillingDashboardSummary(
    params?: FetchBillingDashboardSummaryParams,
  ): Promise<BillingDashboardSummary>;
}

/**
 * buildOrgScopedHeaders
 *
 * Produces optional org-scoping headers for the request.
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
 * buildDelinquencyReportUrl
 *
 * Builds the canonical delinquency reporting endpoint path.
 *
 * We include the trailing slash to stay aligned with Django installations
 * that enforce canonical slash-terminated API routes.
 *
 * @returns The delinquency report endpoint URL.
 */
export function buildDelinquencyReportUrl(): string {
  return "/api/v1/reports/delinquency/";
}

/**
 * buildBillingDashboardSummaryUrl
 *
 * Builds the canonical billing dashboard summary endpoint path.
 *
 * @returns The dashboard summary endpoint URL.
 */
export function buildBillingDashboardSummaryUrl(): string {
  return "/api/v1/reports/dashboard-summary/";
}

/**
 * buildDelinquencyReportQueryParams
 *
 * Maps the UI-facing delinquency query contract to backend query params.
 *
 * The frontend uses `asOf` for readability. The backend expects `as_of`.
 *
 * @param query - UI-facing delinquency query params.
 * @returns Backend-ready query params.
 * @throws Error when `asOf` is missing or blank.
 */
export function buildDelinquencyReportQueryParams(
  query: DelinquencyQueryParams,
): Record<string, string> {
  const normalizedAsOf = query.asOf?.trim();

  if (!normalizedAsOf) {
    throw new Error("An asOf date is required to fetch delinquency reporting.");
  }

  return {
    as_of: normalizedAsOf,
  };
}

/**
 * buildBillingDashboardSummaryQueryParams
 *
 * Maps the optional UI-facing dashboard query contract to backend query params.
 *
 * @param query - Optional UI-facing dashboard query params.
 * @returns Backend-ready query params or undefined.
 */
export function buildBillingDashboardSummaryQueryParams(
  query?: BillingDashboardSummaryQueryParams,
): Record<string, string> | undefined {
  const normalizedAsOf = query?.asOf?.trim();

  if (!normalizedAsOf) {
    return undefined;
  }

  return {
    as_of: normalizedAsOf,
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
 * fetchDelinquencyReport
 *
 * Retrieves the org-level delinquency report.
 *
 * Important architectural boundary:
 * - This function only handles transport concerns.
 * - Aging buckets, delinquency logic, and allocation-aware calculations remain
 *   backend responsibilities.
 *
 * @param client - Injected axios-like HTTP client.
 * @param params - Org-scoped delinquency report params.
 * @returns The typed delinquency report payload.
 */
export async function fetchDelinquencyReport(
  client: BillingGetClient,
  params: FetchDelinquencyReportParams,
): Promise<DelinquencyReportResponse> {
  const response = await client.get<DelinquencyReportResponse>(
    buildDelinquencyReportUrl(),
    {
      headers: buildOrgScopedHeaders(params.orgSlug),
      params: buildDelinquencyReportQueryParams(params.query),
      signal: params.signal,
    },
  );

  return response.data;
}

/**
 * fetchBillingDashboardSummary
 *
 * Retrieves the billing dashboard summary payload used for org-level billing
 * cards and overview metrics.
 *
 * Important:
 * `cash_applied_to_current_month_rent` is allocation-driven backend truth.
 * The frontend should present it exactly as returned rather than inferring
 * it from payment dates alone.
 *
 * @param client - Injected axios-like HTTP client.
 * @param params - Optional org-scoped dashboard summary params.
 * @returns The typed billing dashboard summary payload.
 */
export async function fetchBillingDashboardSummary(
  client: BillingGetClient,
  params?: FetchBillingDashboardSummaryParams,
): Promise<BillingDashboardSummary> {
  const response = await client.get<BillingDashboardSummary>(
    buildBillingDashboardSummaryUrl(),
    {
      headers: buildOrgScopedHeaders(params?.orgSlug),
      params: buildBillingDashboardSummaryQueryParams(params?.query),
      signal: params?.signal,
    },
  );

  return response.data;
}

/**
 * createBillingReportingApi
 *
 * Factory that binds the injected HTTP client and returns the public billing
 * reporting API methods for the feature.
 *
 * @param client - Shared axios-like client for authenticated org-scoped calls.
 * @returns Billing reporting API methods.
 */
export function createBillingReportingApi(
  client: BillingGetClient,
): BillingReportingApi {
  return {
    async fetchDelinquencyReport(
      params: FetchDelinquencyReportParams,
    ): Promise<DelinquencyReportResponse> {
      return fetchDelinquencyReport(client, params);
    },

    async fetchBillingDashboardSummary(
      params?: FetchBillingDashboardSummaryParams,
    ): Promise<BillingDashboardSummary> {
      return fetchBillingDashboardSummary(client, params);
    },
  };
}

export default createBillingReportingApi;