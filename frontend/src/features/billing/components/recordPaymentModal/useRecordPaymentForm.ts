// # Filename: src/features/billing/components/recordPaymentModal/useRecordPaymentForm.ts


import { useEffect, useMemo, useState, type FormEvent } from "react";

import { usePaymentMutations } from "../../hooks/usePaymentMutations";
import type {
  AllocationMode,
  PaymentMethod,
  RecordPaymentFormValues,
} from "../../api/types";
import type {
  RecordPaymentFormState,
  RecordPaymentModalProps,
} from "./recordPaymentModal.types";
import {
  buildInitialFormState,
  getBillingErrorMessage,
  isPositiveAmount,
  normalizeOptionalText,
} from "./recordPaymentModalUtils";

/**
 * UseRecordPaymentFormResult
 *
 * Return contract for the payment modal form orchestration hook.
 *
 * Responsibilities:
 * - expose derived UI state
 * - expose field update helpers
 * - expose submit and close handlers
 * - isolate mutation and form behavior from the modal shell
 */
export interface UseRecordPaymentFormResult {
  formState: RecordPaymentFormState;
  localError: string | null;
  isManualAllocationMode: boolean;
  isSubmitDisabled: boolean;
  createPaymentMutation: ReturnType<typeof usePaymentMutations>["createPaymentMutation"];
  handleOverlayClose: () => void;
  handleFieldChange: <K extends keyof RecordPaymentFormState>(
    field: K,
    value: RecordPaymentFormState[K],
  ) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * useRecordPaymentForm
 *
 * Form orchestration hook for the billing payment modal.
 *
 * Responsibilities:
 * - manage local modal form state
 * - reset and prefill state when the modal opens
 * - support charge-aware payment entry
 * - validate basic client-side input
 * - submit the payment mutation
 * - surface safe user-facing error messages
 *
 * Important:
 * This hook owns UI form behavior only.
 * The backend remains the source of truth for ledger math, allocation safety,
 * and financial correctness.
 *
 * @param props Modal props used to drive form behavior.
 * @returns Prepared modal form state and handlers.
 */
export function useRecordPaymentForm(
  props: RecordPaymentModalProps,
): UseRecordPaymentFormResult {
  const {
    isOpen,
    leaseId,
    orgSlug,
    onClose,
    onSuccess,
    selectedCharge = null,
  } = props;

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

    const nextState = buildInitialFormState();

    // Step 1: Prefill row-level pay actions using the selected charge's
    // remaining balance so the modal can open in charge-aware mode.
    if (selectedCharge) {
      nextState.amount = String(selectedCharge.remaining_balance ?? "");
      nextState.allocationMode = "auto";
    }

    // Step 2: Reset local form state on open using current modal context.
    setFormState(nextState);

    // Step 3: Clear prior client-side errors.
    setLocalError(null);
  }, [isOpen, selectedCharge]);

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
   * Responsibilities:
   * - keep field mutation logic centralized
   * - clear local errors after user edits
   *
   * @param field Form state field name.
   * @param value New field value.
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
   * Responsibilities:
   * - guard obvious invalid input
   * - map UI form state into the API-facing mutation payload
   * - surface readable error messages
   *
   * @param event Native form submit event.
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
      method: formState.method as PaymentMethod,
      externalRef: normalizeOptionalText(formState.externalRef),
      notes: normalizeOptionalText(formState.notes),
      allocationMode: formState.allocationMode as AllocationMode,
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

  return {
    formState,
    localError,
    isManualAllocationMode,
    isSubmitDisabled,
    createPaymentMutation,
    handleOverlayClose,
    handleFieldChange,
    handleSubmit,
  };
}