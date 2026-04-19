// # Filename: src/features/billing/api/types/payments.ts


import type { BillingId, ISODateString, MoneyValue } from "./primitives";
import type { AllocationMode, PaymentMethod } from "./shared";

/**
 * PaymentAllocationInput
 *
 * Explicit charge allocations supplied when a payment is created in
 * manual allocation mode.
 *
 * Responsibilities:
 * - identify the target charge
 * - describe how much payment value should be applied
 */
export interface PaymentAllocationInput {
  charge_id: BillingId;
  amount: MoneyValue;
}

/**
 * RecordPaymentFormValues
 *
 * UI-facing request shape used by billing components and mutation hooks.
 *
 * Responsibilities:
 * - provide a frontend-friendly form contract
 * - stay separate from the backend transport payload shape
 */
export interface RecordPaymentFormValues {
  leaseId: BillingId;
  amount: MoneyValue;
  paidAt: ISODateString;
  method: PaymentMethod;
  externalRef?: string;
  notes?: string;
  allocationMode: AllocationMode;
  allocations?: PaymentAllocationInput[];
}

/**
 * CreatePaymentRequest
 *
 * Backend transport payload for the create-payment endpoint.
 *
 * Responsibilities:
 * - mirror the backend serializer contract
 * - keep backend field names explicit in the API layer
 */
export interface CreatePaymentRequest {
  lease_id: BillingId;
  amount: MoneyValue;
  paid_at: ISODateString;
  method: PaymentMethod;
  external_ref?: string;
  notes?: string;
  allocation_mode: AllocationMode;
  allocations?: PaymentAllocationInput[];
}

/**
 * CreatePaymentResponse
 *
 * Response payload returned after a payment is successfully created.
 *
 * Responsibilities:
 * - return canonical payment creation results
 * - expose allocation and unapplied totals from backend truth
 */
export interface CreatePaymentResponse {
  payment_id: BillingId;
  allocation_mode: AllocationMode;
  allocated_total: MoneyValue;
  unapplied_amount: MoneyValue;
  allocation_ids: BillingId[];
}