// # Filename: src/features/billing/components/GenerateRentChargePanel.tsx


import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useChargeMutations } from "../hooks/useChargeMutations";
import type {
  BillingApiErrorShape,
  BillingId,
  GenerateRentChargeResponse,
} from "../api/billingTypes";

/**
 * GenerateRentChargePanelProps
 *
 * Public props contract for the explicit monthly rent charge generation panel.
 */
export interface GenerateRentChargePanelProps {
  leaseId: BillingId;
  orgSlug?: string | null;
  onSuccess?: (response: GenerateRentChargeResponse) => void;
  requestFieldMode?: "charge_month" | "month";
}

/**
 * GenerateRentChargeFormState
 *
 * Local UI state for the charge-generation panel.
 */
interface GenerateRentChargeFormState {
  monthValue: string;
}

/**
 * getCurrentMonthValue
 *
 * Produces the current local month in `YYYY-MM` format for use with the
 * native `<input type="month" />` control.
 *
 * @returns A month-input-safe current month string.
 */
function getCurrentMonthValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/**
 * buildInitialFormState
 *
 * Creates the initial local form state for the panel.
 *
 * @returns Initial form state with the current month preselected.
 */
function buildInitialFormState(): GenerateRentChargeFormState {
  return {
    monthValue: getCurrentMonthValue(),
  };
}

/**
 * mapMonthInputToChargeMonth
 *
 * Converts a native month input value such as `2026-04` into the explicit
 * charge-month format expected by the billing UI contract: `2026-04-01`.
 *
 * @param monthValue - Native month input value.
 * @returns A backend-friendly charge month string.
 */
function mapMonthInputToChargeMonth(monthValue: string): string {
  return `${monthValue}-01`;
}

/**
 * isValidMonthInput
 *
 * Performs light client-side validation for the month input.
 *
 * Important:
 * This only checks for a non-empty `YYYY-MM`-like value. Lease eligibility,
 * idempotency, and rent generation rules remain backend responsibilities.
 *
 * @param monthValue - Native month input value.
 * @returns True when the input appears usable.
 */
function isValidMonthInput(monthValue: string): boolean {
  return /^\d{4}-\d{2}$/.test(monthValue.trim());
}

/**
 * getBillingErrorMessage
 *
 * Extracts a safe user-facing message from a billing API error shape or
 * generic JavaScript error.
 *
 * @param error - Unknown mutation error.
 * @returns A display-safe error message.
 */
function getBillingErrorMessage(error: unknown): string {
  if (!error) {
    return "Unable to generate the rent charge.";
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

  return "Unable to generate the rent charge.";
}

/**
 * resolveSuccessMessage
 *
 * Produces a user-facing success/info message from the charge-generation
 * response payload.
 *
 * @param response - Charge-generation response payload.
 * @returns A display message for the panel.
 */
function resolveSuccessMessage(response: GenerateRentChargeResponse): string {
  if (response.message?.trim()) {
    return response.message;
  }

  if (response.already_exists) {
    return "A rent charge for this lease and month already exists.";
  }

  if (response.created) {
    return "Rent charge generated successfully.";
  }

  return "Charge request completed.";
}

/**
 * GenerateRentChargePanel
 *
 * Explicit write surface for monthly rent charge generation on a single lease.
 *
 * Responsibilities:
 * - manage the local month input state
 * - validate the month input lightly
 * - call the charge mutation hook
 * - show success and error feedback
 *
 * Important architectural boundary:
 * - The backend remains the source of truth for lease-month overlap,
 *   idempotency, due date derivation, and audit logging.
 * - This panel only captures input and triggers the mutation workflow.
 *
 * @param props - Panel configuration and lifecycle callbacks.
 * @returns A lease-scoped monthly rent charge generation panel.
 */
export default function GenerateRentChargePanel({
  leaseId,
  orgSlug,
  onSuccess,
  requestFieldMode = "charge_month",
}: GenerateRentChargePanelProps) {
  const [formState, setFormState] = useState<GenerateRentChargeFormState>(
    buildInitialFormState,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { generateRentChargeMutation } = useChargeMutations({
    leaseId,
    orgSlug,
    requestFieldMode,
  });

  const isSubmitDisabled = useMemo(() => {
    if (generateRentChargeMutation.isPending) {
      return true;
    }

    if (!isValidMonthInput(formState.monthValue)) {
      return true;
    }

    return false;
  }, [formState.monthValue, generateRentChargeMutation.isPending]);

  useEffect(() => {
    setLocalError(null);
    setStatusMessage(null);
  }, [leaseId]);

  /**
   * handleMonthChange
   *
   * Updates the local month input state and clears any existing panel messages.
   *
   * @param value - New month input value from the form control.
   */
  function handleMonthChange(value: string) {
    setFormState({
      monthValue: value,
    });

    if (localError) {
      setLocalError(null);
    }

    if (statusMessage) {
      setStatusMessage(null);
    }
  }

  /**
   * handleSubmit
   *
   * Validates the selected month and triggers rent charge generation.
   *
   * @param event - Native form submit event.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLocalError(null);
    setStatusMessage(null);

    if (!isValidMonthInput(formState.monthValue)) {
      setLocalError("Select a valid charge month.");
      return;
    }

    try {
      const response = await generateRentChargeMutation.mutateAsync({
        payload: {
          leaseId,
          chargeMonth: mapMonthInputToChargeMonth(formState.monthValue),
        },
        orgSlug,
        requestFieldMode,
      });

      setStatusMessage(resolveSuccessMessage(response));
      onSuccess?.(response);
    } catch (error) {
      setLocalError(getBillingErrorMessage(error));
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          Billing
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Generate rent charge
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Post an explicit monthly rent charge for this lease. The backend
          decides whether the lease is eligible, whether the charge already
          exists, and what due date should be used.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Charge month</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
            onChange={(event) => {
              handleMonthChange(event.target.value);
            }}
            type="month"
            value={formState.monthValue}
          />
          <p className="text-xs leading-5 text-slate-400">
            This will be sent as{" "}
            <span className="font-medium text-slate-300">
              {isValidMonthInput(formState.monthValue)
                ? mapMonthInputToChargeMonth(formState.monthValue)
                : "YYYY-MM-01"}
            </span>
            .
          </p>
        </label>

        {statusMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <p className="text-sm leading-6 text-emerald-100">{statusMessage}</p>
          </div>
        ) : null}

        {localError ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
            <p className="text-sm leading-6 text-rose-100">{localError}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">
            Lease ID:{" "}
            <span className="font-medium text-slate-300">{String(leaseId)}</span>
          </p>

          <button
            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {generateRentChargeMutation.isPending
              ? "Generating..."
              : "Generate rent charge"}
          </button>
        </div>
      </form>
    </section>
  );
}