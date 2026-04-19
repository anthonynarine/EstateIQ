// # Filename: src/features/billing/components/recordPaymentModal/recordPaymentModalUtils.ts


import type {
  AllocationMode,
  BillingApiErrorShape,
  PaymentMethod,
} from "../../api/types";
import type { RecordPaymentFormState } from "./recordPaymentModal.types";

/**
 * getTodayDateString
 *
 * Returns today's local date in `YYYY-MM-DD` form for date inputs.
 *
 * Responsibilities:
 * - create a date-input-safe local string
 * - avoid timezone-shift issues from ISO datetime conversion
 *
 * @returns Today's date as a date-input-safe string.
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * buildInitialFormState
 *
 * Creates the initial modal form state.
 *
 * Responsibilities:
 * - define the default editable values for the modal
 * - keep modal state initialization centralized
 *
 * @returns Initial UI form state for recording a payment.
 */
export function buildInitialFormState(): RecordPaymentFormState {
  return {
    amount: "",
    paidAt: getTodayDateString(),
    method: "zelle" satisfies PaymentMethod,
    externalRef: "",
    notes: "",
    allocationMode: "auto" satisfies AllocationMode,
  };
}

/**
 * normalizeOptionalText
 *
 * Trims optional text input and returns `undefined` when empty.
 *
 * Responsibilities:
 * - normalize optional text fields before transport mapping
 * - prevent empty strings from being sent unnecessarily
 *
 * @param value Optional text field value.
 * @returns A trimmed string or undefined.
 */
export function normalizeOptionalText(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

/**
 * getBillingErrorMessage
 *
 * Extracts a user-facing message from a billing API error shape or generic
 * JavaScript error.
 *
 * Responsibilities:
 * - prefer native Error messages
 * - read billing API envelopes when available
 * - provide a stable fallback message
 *
 * @param error Unknown mutation error.
 * @returns A safe display message.
 */
export function getBillingErrorMessage(error: unknown): string {
  if (!error) {
    return "Unable to record payment.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const apiError = error as BillingApiErrorShape;

  if (apiError.error?.message) {
    return apiError.error.message;
  }

  if (apiError.detail) {
    return apiError.detail;
  }

  if (apiError.message) {
    return apiError.message;
  }

  return "Unable to record payment.";
}

/**
 * isPositiveAmount
 *
 * Validates that a user-entered amount is a positive numeric value.
 *
 * Responsibilities:
 * - guard client-side submit behavior
 * - keep basic numeric validation reusable
 *
 * @param amount User-entered amount string.
 * @returns True when the amount is a positive number.
 */
export function isPositiveAmount(amount: string): boolean {
  const parsedAmount = Number(amount);

  return Number.isFinite(parsedAmount) && parsedAmount > 0;
}