// # Filename: src/features/billing/api/paymentsApi.ts



import type { AxiosResponse } from "axios";

import type {
  AllocationMode,
  BillingApiErrorShape,
  BillingId,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentAllocationInput,
  PaymentMethod,
  RecordPaymentFormValues,
} from "./types";

/**
 * BillingPostClient
 *
 * Minimal axios-like POST contract required by the billing payments API.
 *
 * This keeps the module easy to test and prevents the transport layer from
 * being tightly coupled to a specific axios instance implementation.
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
 * CreatePaymentParams
 *
 * Input contract for creating a payment record through the payments API.
 */
export interface CreatePaymentParams {
  payload: RecordPaymentFormValues;
  orgSlug?: string | null;
  signal?: AbortSignal;
}

/**
 * PaymentsApi
 *
 * Public API surface returned by `createPaymentsApi`.
 */
export interface PaymentsApi {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse>;
}

/**
 * normalizeBillingId
 *
 * Converts a billing identifier into a safe transport value.
 *
 * @param value - Lease or related billing identifier.
 * @returns A trimmed string identifier.
 * @throws Error when the identifier is empty.
 */
function normalizeBillingId(value: BillingId): string {
  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    throw new Error("A valid billing identifier is required.");
  }

  return normalizedValue;
}

/**
 * normalizeMoneyValue
 *
 * Normalizes a money-like value for transport without changing its semantic
 * meaning. We intentionally preserve string decimals when supplied because
 * Django/DRF often treats them as the safest representation.
 *
 * @param value - Money-like value from the form layer.
 * @returns The same value when valid.
 * @throws Error when the value is empty.
 */
function normalizeMoneyValue(value: string | number): string | number {
  if (typeof value === "number") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("A payment amount is required.");
  }

  return trimmedValue;
}

/**
 * normalizeOptionalText
 *
 * Trims optional text fields and omits them when empty.
 *
 * @param value - Optional text input.
 * @returns A trimmed string or undefined.
 */
function normalizeOptionalText(value?: string): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

/**
 * normalizeAllocationMode
 *
 * Ensures allocation mode is a non-empty string before transport.
 *
 * @param value - Allocation mode from the form layer.
 * @returns A safe allocation mode value.
 * @throws Error when the value is empty.
 */
function normalizeAllocationMode(value: AllocationMode): AllocationMode {
  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    throw new Error("An allocation mode is required.");
  }

  return value;
}

/**
 * normalizePaymentMethod
 *
 * Ensures payment method is a non-empty string before transport.
 *
 * @param value - Payment method from the form layer.
 * @returns A safe payment method value.
 * @throws Error when the value is empty.
 */
function normalizePaymentMethod(value: PaymentMethod): PaymentMethod {
  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    throw new Error("A payment method is required.");
  }

  return value;
}

/**
 * normalizeAllocations
 *
 * Normalizes explicit payment allocation instructions for manual allocation
 * mode. Empty allocation arrays are omitted so the request body stays clean.
 *
 * @param allocations - Optional charge allocation inputs.
 * @returns A normalized array or undefined.
 */
function normalizeAllocations(
  allocations?: PaymentAllocationInput[],
): PaymentAllocationInput[] | undefined {
  if (!allocations?.length) {
    return undefined;
  }

  const normalizedAllocations = allocations.map((allocation) => {
    return {
      charge_id: normalizeBillingId(allocation.charge_id),
      amount: normalizeMoneyValue(allocation.amount),
    };
  });

  return normalizedAllocations;
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
 * buildCreatePaymentUrl
 *
 * Builds the canonical create-payment endpoint path.
 *
 * We include the trailing slash to stay aligned with Django installations
 * that enforce canonical slash-terminated API routes.
 *
 * @returns The create-payment endpoint URL.
 */
export function buildCreatePaymentUrl(): string {
  return "/api/v1/payments/";
}

/**
 * mapRecordPaymentFormValuesToRequest
 *
 * Maps the UI-facing payment form contract to the backend transport contract.
 *
 * This separation is important because the form layer should use clear
 * frontend names such as `leaseId` and `paidAt`, while the transport layer
 * can adapt to serializer field names such as `lease_id` and `paid_at`.
 *
 * @param payload - UI-facing payment form values.
 * @returns Backend transport payload for payment creation.
 */
export function mapRecordPaymentFormValuesToRequest(
  payload: RecordPaymentFormValues,
): CreatePaymentRequest {
  return {
    lease_id: normalizeBillingId(payload.leaseId),
    amount: normalizeMoneyValue(payload.amount),
    paid_at: String(payload.paidAt).trim(),
    method: normalizePaymentMethod(payload.method),
    external_ref: normalizeOptionalText(payload.externalRef),
    notes: normalizeOptionalText(payload.notes),
    allocation_mode: normalizeAllocationMode(payload.allocationMode),
    allocations: normalizeAllocations(payload.allocations),
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
 * createPayment
 *
 * Sends a create-payment request to the backend and returns the typed response.
 *
 * Important architectural boundary:
 * - This function does transport normalization only.
 * - Allocation correctness, lease validation, org safety, and ledger math
 *   remain backend responsibilities.
 *
 * @param client - Injected axios-like HTTP client.
 * @param params - Org-scoped payment creation params.
 * @returns The payment creation response payload.
 */
export async function createPayment(
  client: BillingPostClient,
  params: CreatePaymentParams,
): Promise<CreatePaymentResponse> {
  const requestBody = mapRecordPaymentFormValuesToRequest(params.payload);

  const response = await client.post<CreatePaymentResponse, CreatePaymentRequest>(
    buildCreatePaymentUrl(),
    requestBody,
    {
      headers: buildOrgScopedHeaders(params.orgSlug),
      signal: params.signal,
    },
  );

  return response.data;
}

/**
 * createPaymentsApi
 *
 * Factory that binds the injected HTTP client and returns the public payments
 * API methods for the billing feature.
 *
 * @param client - Shared axios-like client for authenticated org-scoped calls.
 * @returns Payments API methods.
 */
export function createPaymentsApi(client: BillingPostClient): PaymentsApi {
  return {
    async createPayment(
      params: CreatePaymentParams,
    ): Promise<CreatePaymentResponse> {
      return createPayment(client, params);
    },
  };
}

export default createPaymentsApi;