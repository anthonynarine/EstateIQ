// # Filename: src/features/billing/components/recordPaymentModal/recordPaymentModalOptions.ts


import type {
  AllocationModeOption,
  PaymentMethodOption,
} from "./recordPaymentModal.types";

/**
 * PAYMENT_METHOD_OPTIONS
 *
 * Stable method options for MVP payment entry.
 *
 * Responsibilities:
 * - centralize supported payment method labels
 * - keep display copy out of the modal shell
 */
export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { value: "cash", label: "Cash" },
  { value: "zelle", label: "Zelle" },
  { value: "ach", label: "ACH" },
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "other", label: "Other" },
];

/**
 * ALLOCATION_MODE_OPTIONS
 *
 * Stable allocation strategy options for MVP payment entry.
 *
 * Responsibilities:
 * - define the user-facing allocation modes
 * - preserve future-safe manual allocation visibility without wiring the
 *   full manual allocator yet
 */
export const ALLOCATION_MODE_OPTIONS: AllocationModeOption[] = [
  {
    value: "auto",
    label: "Auto allocate",
    description: "Apply the payment using backend allocation rules.",
  },
  {
    value: "none",
    label: "Leave unapplied",
    description: "Record the payment without applying it yet.",
  },
  {
    value: "manual",
    label: "Manual allocation",
    description: "Choose exact charges later when manual UI is available.",
  },
];