// # Filename: src/features/billing/components/RecordPaymentModal.tsx

// ✅ New Code

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { usePaymentMutations } from "../hooks/usePaymentMutations";
import type {
  AllocationMode,
  BillingApiErrorShape,
  BillingId,
  CreatePaymentResponse,
  PaymentMethod,
  RecordPaymentFormValues,
} from "../api/billingTypes";

/**
 * RecordPaymentModalProps
 *
 * Public props contract for the billing payment-entry modal.
 */
export interface RecordPaymentModalProps {
  isOpen: boolean;
  leaseId: BillingId;
  orgSlug?: string | null;
  onClose: () => void;
  onSuccess?: (response: CreatePaymentResponse) => void;
}

/**
 * RecordPaymentFormState
 *
 * Local UI state for the payment-entry form.
 *
 * Important:
 * This is intentionally a UI-facing state shape. The API layer performs
 * the final mapping into backend transport field names.
 */
interface RecordPaymentFormState {
  amount: string;
  paidAt: string;
  method: PaymentMethod;
  externalRef: string;
  notes: string;
  allocationMode: AllocationMode;
}

/**
 * PaymentMethodOption
 *
 * Select-option shape for supported payment methods.
 */
interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

/**
 * AllocationModeOption
 *
 * Select-option shape for supported allocation modes.
 */
interface AllocationModeOption {
  value: AllocationMode;
  label: string;
  description: string;
}

/**
 * PAYMENT_METHOD_OPTIONS
 *
 * Stable method options for MVP payment entry.
 */
const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
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
 * Note:
 * We show `manual` as a visible future-safe option, but we block submission
 * while manual allocation UI is not yet implemented.
 */
const ALLOCATION_MODE_OPTIONS: AllocationModeOption[] = [
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

/**
 * getTodayDateString
 *
 * Returns today's local date in `YYYY-MM-DD` form for date inputs.
 *
 * @returns Today's date as a date-input-safe string.
 */
function getTodayDateString(): string {
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
 * @returns Initial UI form state for recording a payment.
 */
function buildInitialFormState(): RecordPaymentFormState {
  return {
    amount: "",
    paidAt: getTodayDateString(),
    method: "zelle",
    externalRef: "",
    notes: "",
    allocationMode: "auto",
  };
}

/**
 * normalizeOptionalText
 *
 * Trims optional text input and returns `undefined` when empty.
 *
 * @param value - Optional text field value.
 * @returns A trimmed string or undefined.
 */
function normalizeOptionalText(value: string): string | undefined {
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
 * @param error - Unknown mutation error.
 * @returns A safe display message.
 */
function getBillingErrorMessage(error: unknown): string {
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
 * @param amount - User-entered amount string.
 * @returns True when the amount is a positive number.
 */
function isPositiveAmount(amount: string): boolean {
  const parsedAmount = Number(amount);

  return Number.isFinite(parsedAmount) && parsedAmount > 0;
}

/**
 * RecordPaymentModal
 *
 * Billing modal for recording a lease payment.
 *
 * Responsibilities:
 * - manage local form state
 * - validate basic client-side input
 * - submit the payment mutation
 * - surface backend errors clearly
 * - reset safely when opened/closed
 *
 * Important architectural boundary:
 * - The backend remains the source of truth for ledger math, allocation
 *   rules, validation, and unapplied balance handling.
 * - This modal only collects input and triggers the mutation workflow.
 *
 * @param props - Modal configuration and lifecycle callbacks.
 * @returns A modal dialog for recording payments, or null when closed.
 */
export default function RecordPaymentModal({
  isOpen,
  leaseId,
  orgSlug,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [formState, setFormState] = useState<RecordPaymentFormState>(
    buildInitialFormState,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const { createPaymentMutation } = usePaymentMutations({
    orgSlug,
    leaseId,
  });

  const isManualAllocationMode = formState.allocationMode === "manual";

  const isSubmitDisabled = useMemo(() => {
    if (createPaymentMutation.isPending) {
      return true;
    }

    if (!isPositiveAmount(formState.amount)) {
      return true;
    }

    if (!formState.paidAt.trim()) {
      return true;
    }

    if (isManualAllocationMode) {
      return true;
    }

    return false;
  }, [
    createPaymentMutation.isPending,
    formState.amount,
    formState.paidAt,
    isManualAllocationMode,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(buildInitialFormState());
    setLocalError(null);
  }, [isOpen]);

  /**
   * handleOverlayClose
   *
   * Closes the modal only when a mutation is not currently in flight.
   */
  function handleOverlayClose() {
    if (createPaymentMutation.isPending) {
      return;
    }

    onClose();
  }

  /**
   * handleFieldChange
   *
   * Updates one field in the local payment form state.
   *
   * @param field - Form state field name.
   * @param value - New field value.
   */
  function handleFieldChange<K extends keyof RecordPaymentFormState>(
    field: K,
    value: RecordPaymentFormState[K],
  ) {
    setFormState((previousState) => {
      return {
        ...previousState,
        [field]: value,
      };
    });

    if (localError) {
      setLocalError(null);
    }
  }

  /**
   * handleSubmit
   *
   * Validates basic form input and records the payment through the billing
   * mutation layer.
   *
   * @param event - Native form submit event.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLocalError(null);

    if (!isPositiveAmount(formState.amount)) {
      setLocalError("Enter a valid payment amount greater than zero.");
      return;
    }

    if (!formState.paidAt.trim()) {
      setLocalError("Select the payment date.");
      return;
    }

    if (isManualAllocationMode) {
      setLocalError(
        "Manual allocation UI is not wired yet. Use Auto allocate or Leave unapplied for now.",
      );
      return;
    }

    const payload: RecordPaymentFormValues = {
      leaseId,
      amount: formState.amount,
      paidAt: formState.paidAt,
      method: formState.method,
      externalRef: normalizeOptionalText(formState.externalRef),
      notes: normalizeOptionalText(formState.notes),
      allocationMode: formState.allocationMode,
    };

    try {
      const response = await createPaymentMutation.mutateAsync({
        payload,
        orgSlug,
      });

      onSuccess?.(response);
      onClose();
    } catch (error) {
      setLocalError(getBillingErrorMessage(error));
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="record-payment-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
              Billing
            </p>
            <h2
              id="record-payment-modal-title"
              className="mt-2 text-xl font-semibold text-white"
            >
              Record payment
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Create a payment for lease{" "}
              <span className="font-medium text-slate-100">{String(leaseId)}</span>.
              The backend remains responsible for allocation safety and ledger
              correctness.
            </p>
          </div>

          <button
            aria-label="Close record payment modal"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createPaymentMutation.isPending}
            onClick={handleOverlayClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                Amount
              </span>
              <input
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                inputMode="decimal"
                onChange={(event) => {
                  handleFieldChange("amount", event.target.value);
                }}
                placeholder="0.00"
                type="text"
                value={formState.amount}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                Paid at
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
                onChange={(event) => {
                  handleFieldChange("paidAt", event.target.value);
                }}
                type="date"
                value={formState.paidAt}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                Payment method
              </span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
                onChange={(event) => {
                  handleFieldChange("method", event.target.value as PaymentMethod);
                }}
                value={formState.method}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  return (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                Allocation mode
              </span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
                onChange={(event) => {
                  handleFieldChange(
                    "allocationMode",
                    event.target.value as AllocationMode,
                  );
                }}
                value={formState.allocationMode}
              >
                {ALLOCATION_MODE_OPTIONS.map((option) => {
                  return (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  );
                })}
              </select>

              <p className="text-xs leading-5 text-slate-400">
                {
                  ALLOCATION_MODE_OPTIONS.find(
                    (option) => option.value === formState.allocationMode,
                  )?.description
                }
              </p>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                External reference
              </span>
              <input
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                onChange={(event) => {
                  handleFieldChange("externalRef", event.target.value);
                }}
                placeholder="Check number, confirmation id, etc."
                type="text"
                value={formState.externalRef}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                Notes
              </span>
              <input
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                onChange={(event) => {
                  handleFieldChange("notes", event.target.value);
                }}
                placeholder="Optional context"
                type="text"
                value={formState.notes}
              />
            </label>
          </div>

          {isManualAllocationMode ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
              <p className="text-sm leading-6 text-amber-100">
                Manual allocation is visible for future billing growth, but the
                charge-picking UI is not wired yet. For now, use{" "}
                <span className="font-medium">Auto allocate</span> or{" "}
                <span className="font-medium">Leave unapplied</span>.
              </p>
            </div>
          ) : null}

          {localError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
              <p className="text-sm leading-6 text-rose-100">{localError}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createPaymentMutation.isPending}
              onClick={handleOverlayClose}
              type="button"
            >
              Cancel
            </button>

            <button
              className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitDisabled}
              type="submit"
            >
              {createPaymentMutation.isPending ? "Recording..." : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}