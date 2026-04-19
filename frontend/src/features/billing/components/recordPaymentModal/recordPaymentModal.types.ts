// # Filename: src/features/billing/components/recordPaymentModal/recordPaymentModal.types.ts


import type {
  BillingId,
  CreatePaymentResponse,
  LeaseLedgerCharge,
} from "../../api/types";

/**
 * RecordPaymentModalProps
 *
 * Public props contract for the billing payment-entry modal.
 *
 * Responsibilities:
 * - open in general lease-payment mode
 * - optionally open in charge-prefilled mode
 * - receive page-owned open-charge context
 * - expose lifecycle hooks for close and success behavior
 *
 * Important:
 * This is a UI component contract, not an API transport type.
 */
export interface RecordPaymentModalProps {
  isOpen: boolean;
  leaseId: BillingId;
  orgSlug?: string | null;
  onClose: () => void;
  onSuccess?: (response: CreatePaymentResponse) => void;
  selectedCharge?: LeaseLedgerCharge | null;
  openCharges?: LeaseLedgerCharge[];
}

/**
 * RecordPaymentFormState
 *
 * Local UI state for the payment-entry form.
 *
 * Responsibilities:
 * - represent the modal's editable fields
 * - stay UI-facing and separate from backend transport field names
 */
export interface RecordPaymentFormState {
  amount: string;
  paidAt: string;
  method: string;
  externalRef: string;
  notes: string;
  allocationMode: string;
}

/**
 * PaymentMethodOption
 *
 * Select-option shape for supported payment methods.
 */
export interface PaymentMethodOption {
  value: string;
  label: string;
}

/**
 * AllocationModeOption
 *
 * Select-option shape for supported allocation modes.
 */
export interface AllocationModeOption {
  value: string;
  label: string;
  description: string;
}