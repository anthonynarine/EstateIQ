// # Filename: src/features/billing/api/types/rentCharges.ts

// ✅ New Code

import type { BillingId, ISODateString, MoneyValue } from "./primitives";
import type { ChargeKind, ChargeStatus } from "./shared";

/**
 * GenerateRentChargeFormValues
 *
 * UI-facing request shape for the "Generate Rent Charge" panel.
 *
 * Responsibilities:
 * - let the UI work with a lease id plus a selected month anchor
 * - keep frontend form state separate from backend transport fields
 */
export interface GenerateRentChargeFormValues {
  leaseId: BillingId;
  chargeMonth: ISODateString;
}

/**
 * GenerateRentChargeRequest
 *
 * Canonical backend transport payload for monthly rent charge generation.
 */
export interface GenerateRentChargeRequest {
  charge_month: ISODateString;
}

/**
 * GenerateRentChargeResponse
 *
 * Response contract for month charge generation.
 *
 * Responsibilities:
 * - indicate whether the charge was created or already existed
 * - return canonical month and due-date metadata
 * - provide room for richer response fields
 */
export interface GenerateRentChargeResponse {
  charge_id: BillingId;
  created: boolean;
  already_exists: boolean;
  due_date: ISODateString;
  charge_month: ISODateString;
  message: string;
  kind?: ChargeKind;
  amount?: MoneyValue;
  status?: ChargeStatus;
  [key: string]: unknown;
}