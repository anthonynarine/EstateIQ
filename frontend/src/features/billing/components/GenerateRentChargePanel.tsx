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
  requestFieldMode?: "charge_month" | "month";

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
  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue.slice(0, 7);
  }

  return null;
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
  if (response.message?.trim()) {
    return {
      tone: response.already_exists ? "info" : "success",
      message: response.message,
    };
  }

  if (response.already_exists) {
    return {
      tone: "info",
      message: "A rent charge for this month is already on the ledger.",
    };
  }

  if (response.created) {
    return {
      tone: "success",
      message: "Rent charge generated successfully.",
    };
  }

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
    return "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-3";
  }

  if (tone === "error") {
    return "rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-3";
  }

  return "rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-3";
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
    return "text-sm leading-6 text-emerald-100";
  }

  if (tone === "error") {
    return "text-sm leading-6 text-rose-100";
  }

  return "text-sm leading-6 text-cyan-100";
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
  requestFieldMode = "charge_month",
  existingChargeMonths = [],
}: GenerateRentChargePanelProps) {
  const [formState, setFormState] = useState<GenerateRentChargeFormState>(
    buildInitialFormState,
  );
  const [panelNotice, setPanelNotice] = useState<PanelNotice | null>(null);

  const { generateRentChargeMutation } = useChargeMutations({
    leaseId,
    orgSlug,
    requestFieldMode,
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
        message: "A rent charge for this month is already on the ledger.",
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
    setFormState({
      monthValue: value,
    });

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
    event.preventDefault();

    setPanelNotice(null);

    if (!isValidMonthInput(formState.monthValue)) {
      setPanelNotice({
        tone: "error",
        message: "Select a valid charge month.",
      });
      return;
    }

    if (selectedMonthAlreadyExists) {
      setPanelNotice({
        tone: "info",
        message: "A rent charge for this month is already on the ledger.",
      });
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

      setPanelNotice(resolveResponseNotice(response));
      onSuccess?.(response);
    } catch (error) {
      setPanelNotice({
        tone: "error",
        message: getBillingErrorMessage(error),
      });
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Rent posting
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">
            Generate monthly rent charge
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Explicit monthly posting only. Eligibility, duplicate protection,
            and due date stay backend-owned.
          </p>
        </div>

        {selectedChargeMonthValue ? (
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {selectedChargeMonthValue}
          </span>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Charge month
            </span>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={generateRentChargeMutation.isPending}
                onChange={(event) => {
                  handleMonthChange(event.target.value);
                }}
                type="month"
                value={formState.monthValue}
              />

              {!isCurrentMonthSelected ? (
                <button
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                  onClick={handleResetToCurrentMonth}
                  type="button"
                >
                  Current month
                </button>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {selectedChargeMonthValue
                ? `Posts as ${selectedChargeMonthValue}.`
                : "Select a valid month to continue."}
            </p>
          </label>

          <button
            className="inline-flex min-w-[172px] items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/12 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {generateRentChargeMutation.isPending
              ? "Generating..."
              : selectedMonthAlreadyExists
                ? "Already on ledger"
                : "Generate charge"}
          </button>
        </div>

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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
          <p className="text-[11px] leading-5 text-slate-500">
            Lease{" "}
            <span className="font-medium text-slate-400">{String(leaseId)}</span>
          </p>

          <p className="text-[11px] leading-5 text-slate-500">
            One explicit month posting at a time.
          </p>
        </div>
      </form>
    </section>
  );
}