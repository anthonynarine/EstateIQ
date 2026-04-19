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
 *
 * Important:
 * This is a component contract, not an API contract.
 * It belongs with the modal, not inside `api/types`.
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