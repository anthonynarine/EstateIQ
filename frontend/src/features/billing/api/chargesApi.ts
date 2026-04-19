
// # Filename: src/features/billing/api/chargesApi.ts

import type { AxiosResponse } from "axios";

import type {
  BillingApiErrorShape,
  BillingId,
  ChargeKind,
  ChargeStatus,
  GenerateRentChargeFormValues,
  GenerateRentChargeRequest,
  GenerateRentChargeResponse,
} from "../api/types";

/**
 * BillingPostClient
 *
 * Minimal axios-like POST contract required by the billing charges API.
 */
export interface BillingPostClient {
  post<TResponse, TRequest>(
    url: string,
    data?: TRequest,
    config?: {
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ): Promise<AxiosResponse<TResponse>>;
}

/**
 * CreateRentChargeParams
 *
 * Input contract for explicitly generating a monthly rent charge for a lease.
 */
export interface CreateRentChargeParams {
  payload: GenerateRentChargeFormValues;
  orgSlug?: string | null;
  signal?: AbortSignal;
}

/**
 * ChargesApi
 *
 * Public API surface returned by `createChargesApi`.
 */
export interface ChargesApi {
  generateRentCharge(
    params: CreateRentChargeParams,
  ): Promise<GenerateRentChargeResponse>;
}

/**
 * normalizeBillingId
 *
 * Converts a billing identifier into a safe path segment.
 *
 * @param value - Raw lease identifier.
 * @returns A normalized string version of the identifier.
 * @throws Error when the identifier is missing or blank.
 */
function normalizeBillingId(value: BillingId): string {
  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    throw new Error("A valid leaseId is required to generate a rent charge.");
  }

  return normalizedValue;
}

/**
 * normalizeChargeMonth
 *
 * Validates the UI-facing charge month string before it is sent to the API.
 *
 * Expected format:
 * `YYYY-MM-01`
 *
 * We keep validation intentionally lightweight here because the backend
 * remains the source of truth for business validation.
 *
 * @param chargeMonth - UI-facing charge month value.
 * @returns A trimmed charge month string.
 * @throws Error when the charge month is missing or blank.
 */
function normalizeChargeMonth(chargeMonth: string): string {
  const normalizedValue = chargeMonth.trim();

  if (!normalizedValue) {
    throw new Error("A charge month is required to generate a rent charge.");
  }

  return normalizedValue;
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
 * buildGenerateRentChargeUrl
 *
 * Builds the canonical monthly rent charge generation endpoint path.
 *
 * @param leaseId - Lease identifier used in the route path.
 * @returns Lease-specific rent charge generation endpoint URL.
 */
export function buildGenerateRentChargeUrl(leaseId: BillingId): string {
  const normalizedLeaseId = normalizeBillingId(leaseId);

  return `/api/v1/leases/${normalizedLeaseId}/charges/generate-month/`;
}

/**
 * mapGenerateRentChargeFormValuesToRequest
 *
 * Maps the UI-facing generate-charge form contract to the stabilized backend
 * transport contract using `charge_month`.
 *
 * @param payload - UI-facing generate-charge values.
 * @returns Stabilized backend request payload.
 */
export function mapGenerateRentChargeFormValuesToRequest(
  payload: GenerateRentChargeFormValues,
): GenerateRentChargeRequest {
  return {
    charge_month: normalizeChargeMonth(payload.chargeMonth),
  };
}

/**
 * mapGenerateRentChargeResponse
 *
 * Normalizes the response into a stable frontend-friendly shape without
 * inventing business data that the backend did not return.
 *
 * @param response - Raw backend response payload.
 * @returns Normalized generate-charge response.
 */
export function mapGenerateRentChargeResponse(
  response: GenerateRentChargeResponse,
): GenerateRentChargeResponse {
  return {
    ...response,
    charge_id: response.charge_id,
    created: response.created,
    already_exists: response.already_exists,
    kind: response.kind as ChargeKind | undefined,
    amount: response.amount,
    due_date: response.due_date,
    charge_month: response.charge_month,
    status: response.status as ChargeStatus | undefined,
    message: response.message,
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
 * generateRentCharge
 *
 * Sends an explicit monthly rent charge generation request for a single lease.
 *
 * Important architectural boundary:
 * - This function only handles transport mapping.
 * - Lease eligibility, idempotency, due date derivation, and audit logging
 *   remain backend responsibilities.
 *
 * @param client - Injected axios-like HTTP client.
 * @param params - Lease-specific generate-charge request params.
 * @returns The typed generate-charge response payload.
 */
export async function generateRentCharge(
  client: BillingPostClient,
  params: CreateRentChargeParams,
): Promise<GenerateRentChargeResponse> {
  const requestBody = mapGenerateRentChargeFormValuesToRequest(params.payload);

  const response = await client.post<
    GenerateRentChargeResponse,
    GenerateRentChargeRequest
  >(buildGenerateRentChargeUrl(params.payload.leaseId), requestBody, {
    headers: buildOrgScopedHeaders(params.orgSlug),
    signal: params.signal,
  });

  return mapGenerateRentChargeResponse(response.data);
}

/**
 * createChargesApi
 *
 * Factory that binds the injected HTTP client and returns the public charges
 * API methods for the billing feature.
 *
 * @param client - Shared axios-like client for authenticated org-scoped calls.
 * @returns Charges API methods.
 */
export function createChargesApi(client: BillingPostClient): ChargesApi {
  return {
    async generateRentCharge(
      params: CreateRentChargeParams,
    ): Promise<GenerateRentChargeResponse> {
      return await generateRentCharge(client, params);
    },
  };
}

export default createChargesApi;