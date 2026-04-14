
// # Filename: src/features/billing/components/GenerateRentChargePanel.tsx

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useChargeMutations } from "../hooks/useChargeMutations";
import type {
  BillingApiErrorShape,
  BillingId,
  GenerateRentChargeResponse,
} from "../api/billingTypes";

/**
 * PanelNoticeTone
 *
 * Visual tone for inline panel feedback.
 */
type PanelNoticeTone = "success" | "info" | "error";

/**
 * PanelNotice
 *
 * Lightweight message model for panel feedback.
 */
interface PanelNotice {
  tone: PanelNoticeTone;
  message: string;
}

/**
 * GenerateRentChargePanelProps
 *
 * Public props contract for the explicit monthly rent charge generation panel.
 */
export interface GenerateRentChargePanelProps {
  leaseId: BillingId;
  orgSlug?: string | null;
  onSuccess?: (response: GenerateRentChargeResponse) => void;

  /**
   * Known posted charge months for this lease.
   *
   * Accepts either:
   * - `YYYY-MM`
   * - `YYYY-MM-DD`
   *
   * This lets the panel show an "already on ledger" state before submit
   * without recomputing billing truth locally.
   */
  existingChargeMonths?: string[];
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
  // Step 1: Read the current local date.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Step 2: Return the native month-input format.
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
 * charge-month format expected by the backend contract: `2026-04-01`.
 *
 * @param monthValue - Native month input value.
 * @returns A backend-friendly charge month string.
 */
function mapMonthInputToChargeMonth(monthValue: string): string {
  // Step 1: Normalize the input.
  const normalizedMonthValue = monthValue.trim();

  // Step 2: Convert it into the month-anchor payload.
  return `${normalizedMonthValue}-01`;
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
  // Step 1: Validate the browser month input shape.
  return /^\d{4}-\d{2}$/.test(monthValue.trim());
}

/**
 * normalizeKnownChargeMonth
 *
 * Normalizes known charge-month strings into a comparable `YYYY-MM` value.
 *
 * Supported shapes:
 * - `YYYY-MM`
 * - `YYYY-MM-DD`
 *
 * @param value - Incoming known charge month.
 * @returns A normalized comparable month value or null.
 */
function normalizeKnownChargeMonth(value: string): string | null {
  // Step 1: Normalize whitespace.
  const trimmedValue = value.trim();

  // Step 2: Pass through already-normalized month values.
  if (/^\d{4}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  // Step 3: Reduce full dates to comparable month values.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue.slice(0, 7);
  }

  // Step 4: Reject unsupported shapes.
  return null;
}

/**
 * getNestedFieldErrorMessage
 *
 * Attempts to extract a human-readable message from field-level DRF-style
 * validation errors.
 *
 * @param value - Unknown nested error value.
 * @returns A display-safe message or null.
 */
function getNestedFieldErrorMessage(value: unknown): string | null {
  // Step 1: Accept direct string messages.
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  // Step 2: Accept first string item from array-based field errors.
  if (Array.isArray(value) && value.length > 0) {
    const firstValue = value[0];

    if (typeof firstValue === "string" && firstValue.trim()) {
      return firstValue;
    }
  }

  return null;
}

function getBillingErrorMessage(error: unknown): string {
  // Step 1: Handle empty errors.
  if (!error) {
    return "Unable to generate the rent charge.";
  }

  // Step 2: Check axios-like response payload first.
  if (typeof error === "object" && error !== null) {
    const errorRecord = error as {
      response?: {
        data?: Record<string, unknown>;
      };
      error?: {
        message?: string;
      };
      detail?: string;
      message?: string;
    };

    const responseData = errorRecord.response?.data;

    if (responseData) {
      if (
        typeof responseData.error === "object" &&
        responseData.error !== null &&
        "message" in responseData.error
      ) {
        const nestedMessage = (responseData.error as { message?: unknown }).message;

        if (typeof nestedMessage === "string" && nestedMessage.trim()) {
          return nestedMessage;
        }
      }

      if (typeof responseData.detail === "string" && responseData.detail.trim()) {
        return responseData.detail;
      }

      if (typeof responseData.message === "string" && responseData.message.trim()) {
        return responseData.message;
      }

      for (const value of Object.values(responseData)) {
        const fieldMessage = getNestedFieldErrorMessage(value);
        if (fieldMessage) {
          return fieldMessage;
        }
      }
    }

    // Step 3: Check top-level narrowed API fields next.
    if (errorRecord.error?.message) {
      return errorRecord.error.message;
    }

    if (errorRecord.detail?.trim()) {
      return errorRecord.detail;
    }

    if (
      errorRecord.message?.trim() &&
      errorRecord.message !== "Request failed with status code 400"
    ) {
      return errorRecord.message;
    }
  }

  // Step 4: Fall back to ordinary JS errors only after response parsing.
  if (error instanceof Error && error.message.trim()) {
    if (error.message === "Request failed with status code 400") {
      return "Unable to generate the rent charge.";
    }

    return error.message;
  }

  // Step 5: Final fallback.
  return "Unable to generate the rent charge.";
}

/**
 * resolveResponseNotice
 *
 * Produces a user-facing notice from the charge-generation response payload.
 *
 * @param response - Charge-generation response payload.
 * @returns A typed inline panel notice.
 */
function resolveResponseNotice(
  response: GenerateRentChargeResponse,
): PanelNotice {
  // Step 1: Prefer explicit backend messages when present.
  if (response.message?.trim()) {
    return {
      tone: response.already_exists ? "info" : "success",
      message: response.message,
    };
  }

  // Step 2: Treat non-created responses as existing/idempotent outcomes.
  if (response.already_exists || response.created === false) {
    return {
      tone: "info",
      message: "Already posted for this month.",
    };
  }

  // Step 3: Handle successful creation.
  if (response.created) {
    return {
      tone: "success",
      message: "Rent charge generated.",
    };
  }

  // Step 4: Provide a final safe fallback.
  return {
    tone: "info",
    message: "Charge request completed.",
  };
}

/**
 * getNoticeContainerClasses
 *
 * Returns the container classes for a given notice tone.
 *
 * @param tone - Visual tone for the notice.
 * @returns Tailwind class string.
 */
function getNoticeContainerClasses(tone: PanelNoticeTone): string {
  if (tone === "success") {
    return "rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-3 py-2.5";
  }

  if (tone === "error") {
    return "rounded-xl border border-rose-400/15 bg-rose-400/8 px-3 py-2.5";
  }

  return "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5";
}

/**
 * getNoticeTextClasses
 *
 * Returns the text classes for a given notice tone.
 *
 * @param tone - Visual tone for the notice.
 * @returns Tailwind class string.
 */
function getNoticeTextClasses(tone: PanelNoticeTone): string {
  if (tone === "success") {
    return "text-sm leading-5 text-emerald-100";
  }

  if (tone === "error") {
    return "text-sm leading-5 text-rose-100";
  }

  return "text-sm leading-5 text-neutral-300";
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
 * - show compact success / info / error feedback
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
  existingChargeMonths = [],
}: GenerateRentChargePanelProps) {
  const [formState, setFormState] = useState<GenerateRentChargeFormState>(
    buildInitialFormState,
  );
  const [panelNotice, setPanelNotice] = useState<PanelNotice | null>(null);

  const { generateRentChargeMutation } = useChargeMutations({
    leaseId,
    orgSlug,
  });

  const currentMonthValue = useMemo(() => getCurrentMonthValue(), []);

  const knownExistingChargeMonths = useMemo(() => {
    return new Set(
      existingChargeMonths
        .map(normalizeKnownChargeMonth)
        .filter((value): value is string => value !== null),
    );
  }, [existingChargeMonths]);

  const selectedChargeMonthValue = useMemo(() => {
    if (!isValidMonthInput(formState.monthValue)) {
      return null;
    }

    return mapMonthInputToChargeMonth(formState.monthValue);
  }, [formState.monthValue]);

  const selectedMonthAlreadyExists = useMemo(() => {
    if (!isValidMonthInput(formState.monthValue)) {
      return false;
    }

    return knownExistingChargeMonths.has(formState.monthValue);
  }, [formState.monthValue, knownExistingChargeMonths]);

  const isCurrentMonthSelected = formState.monthValue === currentMonthValue;

  const passiveInfoNotice = useMemo<PanelNotice | null>(() => {
    if (selectedMonthAlreadyExists) {
      return {
        tone: "info",
        message: "Already posted for this month.",
      };
    }

    return null;
  }, [selectedMonthAlreadyExists]);

  const activeNotice = panelNotice ?? passiveInfoNotice;

  const isSubmitDisabled = useMemo(() => {
    if (generateRentChargeMutation.isPending) {
      return true;
    }

    if (!isValidMonthInput(formState.monthValue)) {
      return true;
    }

    if (selectedMonthAlreadyExists) {
      return true;
    }

    return false;
  }, [
    formState.monthValue,
    generateRentChargeMutation.isPending,
    selectedMonthAlreadyExists,
  ]);

  useEffect(() => {
    setPanelNotice(null);
  }, [leaseId]);

  /**
   * handleMonthChange
   *
   * Updates the local month input state and clears request-specific feedback.
   *
   * @param value - New month input value from the form control.
   */
  function handleMonthChange(value: string) {
    // Step 1: Update local form state.
    setFormState({
      monthValue: value,
    });

    // Step 2: Clear active notice when the user changes the target month.
    if (panelNotice) {
      setPanelNotice(null);
    }
  }

  /**
   * handleResetToCurrentMonth
   *
   * Resets the month selector back to the current month.
   */
  function handleResetToCurrentMonth() {
    // Step 1: Reset the month input.
    handleMonthChange(currentMonthValue);
  }

  /**
   * handleSubmit
   *
   * Validates the selected month and triggers rent charge generation.
   *
   * @param event - Native form submit event.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Step 1: Stop native form submission.
    event.preventDefault();

    // Step 2: Clear any existing active notice.
    setPanelNotice(null);

    // Step 3: Validate the browser month input.
    if (!isValidMonthInput(formState.monthValue)) {
      setPanelNotice({
        tone: "error",
        message: "Select a valid charge month.",
      });
      return;
    }

    // Step 4: Short-circuit obvious existing-month attempts.
    if (selectedMonthAlreadyExists) {
      setPanelNotice({
        tone: "info",
        message: "Already posted for this month.",
      });
      return;
    }

    try {
      // Step 5: Submit the stabilized charge_month payload.
      const response = await generateRentChargeMutation.mutateAsync({
        payload: {
          leaseId,
          chargeMonth: mapMonthInputToChargeMonth(formState.monthValue),
        },
        orgSlug,
      });

      // Step 6: Show a result notice and bubble success upward.
      setPanelNotice(resolveResponseNotice(response));
      onSuccess?.(response);
    } catch (error) {
      // Step 7: Show a clean user-facing error message.
      setPanelNotice({
        tone: "error",
        message: getBillingErrorMessage(error),
      });
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-950 px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Rent posting
          </p>

          <h2 className="mt-1 text-base font-semibold text-white">
            Generate monthly rent charge
          </h2>

          <p className="mt-1 text-sm leading-6 text-neutral-400">
            Post one explicit month at a time.
          </p>
        </div>

        {selectedChargeMonthValue ? (
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-neutral-300">
            {selectedChargeMonthValue}
          </span>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-200">
              Charge month
            </span>

            <div className="mt-2 flex flex-col gap-2">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={generateRentChargeMutation.isPending}
                onChange={(event) => {
                  handleMonthChange(event.target.value);
                }}
                type="month"
                value={formState.monthValue}
              />

              {!isCurrentMonthSelected ? (
                <button
                  className="inline-flex w-fit items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-white/[0.06]"
                  onClick={handleResetToCurrentMonth}
                  type="button"
                >
                  Use current month
                </button>
              ) : null}
            </div>
          </label>

          <p className="text-[11px] leading-5 text-neutral-500">
            {selectedChargeMonthValue
              ? `Posts as ${selectedChargeMonthValue}.`
              : "Select a valid month to continue."}
          </p>
        </div>

        <button
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitDisabled}
          type="submit"
        >
          {generateRentChargeMutation.isPending
            ? "Generating..."
            : selectedMonthAlreadyExists
              ? "Already on ledger"
              : "Generate charge"}
        </button>

        {activeNotice ? (
          <div
            aria-live="polite"
            className={getNoticeContainerClasses(activeNotice.tone)}
          >
            <p className={getNoticeTextClasses(activeNotice.tone)}>
              {activeNotice.message}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
          <p className="text-[11px] leading-5 text-neutral-500">
            Lease{" "}
            <span className="font-medium text-neutral-400">{String(leaseId)}</span>
          </p>

          <p className="text-[11px] leading-5 text-neutral-500">
            Explicit only
          </p>
        </div>
      </form>
    </section>
  );
}