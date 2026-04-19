// # Filename: src/features/billing/api/types/errors.ts



/**
 * BillingApiErrorShape
 *
 * Lightweight shared error envelope for billing-related API calls.
 *
 * Responsibilities:
 * - narrow API error payloads in query and mutation hooks
 * - provide a stable shared shape for user-facing error extraction
 */
export interface BillingApiErrorShape {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  detail?: string;
  message?: string;
  [key: string]: unknown;
}