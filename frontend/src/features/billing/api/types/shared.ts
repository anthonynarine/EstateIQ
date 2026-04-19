// # Filename: src/features/billing/api/types/shared.ts


import type { BillingId, ExtensibleString } from "./primitives";

/**
 * ChargeKind
 *
 * Stable charge kinds currently expected by the billing backend.
 *
 * Responsibilities:
 * - model current known billing charge kinds
 * - stay extensible for future billing growth
 */
export type ChargeKind = ExtensibleString<"rent" | "late_fee" | "misc">;

/**
 * ChargeStatus
 *
 * Workflow status for a charge record.
 */
export type ChargeStatus = ExtensibleString<"posted" | "void">;

/**
 * PaymentMethod
 *
 * Supported payment methods for MVP billing entry.
 */
export type PaymentMethod = ExtensibleString<
  "cash" | "zelle" | "ach" | "check" | "venmo" | "other"
>;

/**
 * AllocationMode
 *
 * Strategy used when creating a payment.
 *
 * Common expectations:
 * - auto: backend allocates deterministically
 * - manual: caller sends explicit allocations
 * - none: payment remains unapplied
 */
export type AllocationMode = ExtensibleString<"auto" | "manual" | "none">;

/**
 * AgingBucketKey
 *
 * Standard delinquency aging buckets for reporting.
 */
export type AgingBucketKey = ExtensibleString<
  "current" | "1_30" | "31_60" | "61_90" | "90_plus"
>;

/**
 * BillingEntitySummary
 *
 * Lightweight display object for related billing entities.
 *
 * Responsibilities:
 * - provide a stable nested summary shape
 * - avoid repeating raw primitive fields everywhere
 */
export interface BillingEntitySummary {
  id: BillingId;
  label: string;
}

/**
 * BillingTableEmptyState
 *
 * Optional helper union for future component-level empty-state rendering.
 */
export type BillingTableEmptyState =
  | "no_charges"
  | "no_payments"
  | "no_allocations"
  | "no_delinquency_rows";