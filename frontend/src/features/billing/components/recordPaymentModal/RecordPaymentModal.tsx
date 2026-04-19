// # Filename: src/features/billing/components/RecordPaymentModal.tsx


import type { MoneyValue } from "../../api/types";
import {
  ALLOCATION_MODE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from "./recordPaymentModalOptions";
import type { RecordPaymentModalProps } from "./recordPaymentModal.types";
import { useRecordPaymentForm } from "./useRecordPaymentForm";

/**
 * FIELD_CLASS_NAME
 *
 * Shared field styling for the payment modal form controls.
 *
 * Responsibilities:
 * - keep the modal visually aligned with the lease-ledger workspace
 * - centralize repeated input/select classes
 */
const FIELD_CLASS_NAME =
  "w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400/30 focus:bg-neutral-900";

/**
 * LABEL_CLASS_NAME
 *
 * Shared label wrapper styling for form fields.
 */
const LABEL_CLASS_NAME = "space-y-2";

/**
 * LABEL_TEXT_CLASS_NAME
 *
 * Shared text styling for field labels.
 */
const LABEL_TEXT_CLASS_NAME = "text-sm font-medium text-neutral-200";

/**
 * formatMoneyDisplay
 *
 * Formats a billing money value into a display-safe USD string.
 *
 * Responsibilities:
 * - support string or number API money shapes
 * - provide a stable display fallback for the modal context banner
 *
 * @param value Monetary value from billing state.
 * @returns USD-formatted display string.
 */
function formatMoneyDisplay(value?: MoneyValue): string {
  const numericValue = Number(value ?? 0);

  return numericValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * formatChargeKindLabel
 *
 * Converts backend charge kinds into a more readable UI label.
 *
 * Responsibilities:
 * - normalize underscore-delimited charge kinds
 * - keep charge-context copy polished for the modal
 *
 * @param kind Raw charge kind from the ledger.
 * @returns Human-readable charge kind label.
 */
function formatChargeKindLabel(kind: string): string {
  return kind
    .split("_")
    .filter(Boolean)
    .map((segment) => {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

/**
 * formatDateLabel
 *
 * Formats a date-like value into a friendlier display label.
 *
 * Responsibilities:
 * - provide readable charge context copy
 * - fall back safely when the value is missing or invalid
 *
 * @param value Date-like string.
 * @returns A display-safe date label.
 */
function formatDateLabel(value?: string | null): string {
  if (!value?.trim()) {
    return "Unknown due date";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * RecordPaymentModal
 *
 * Billing modal shell for recording a lease payment.
 *
 * Responsibilities:
 * - render the payment-entry modal structure
 * - render charge-aware payment context when opened from a row-level Pay action
 * - delegate form state, validation, and submit behavior to the extracted hook
 * - keep styling aligned with the rest of the billing workspace
 *
 * Important architectural boundary:
 * - The page remains responsible for orchestration and selected charge context.
 * - The hook remains responsible for modal form behavior and mutation flow.
 * - The backend remains the source of truth for ledger correctness.
 *
 * @param props Modal lifecycle and billing context props.
 * @returns The styled payment-entry modal shell, or null when closed.
 */
export default function RecordPaymentModal(
  props: RecordPaymentModalProps,
) {
  const {
    isOpen,
    leaseId,
    selectedCharge = null,
    openCharges = [],
  } = props;

  const {
    formState,
    localError,
    isManualAllocationMode,
    isSubmitDisabled,
    createPaymentMutation,
    handleOverlayClose,
    handleFieldChange,
    handleSubmit,
  } = useRecordPaymentForm(props);

  const activeAllocationModeDescription =
    ALLOCATION_MODE_OPTIONS.find((option) => {
      return option.value === formState.allocationMode;
    })?.description ?? "";

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="record-payment-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800/80 px-8 py-7">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
              Billing
            </p>

            <h2
              id="record-payment-modal-title"
              className="mt-2 text-[2rem] font-semibold tracking-tight text-white"
            >
              Record payment
            </h2>

            <p className="mt-3 text-base leading-7 text-neutral-400">
              Create a payment for lease{" "}
              <span className="font-medium text-white">{String(leaseId)}</span>.
              The backend remains responsible for allocation safety and ledger
              correctness.
            </p>
          </div>

          <button
            aria-label="Close record payment modal"
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createPaymentMutation.isPending}
            onClick={handleOverlayClose}
            type="button"
          >
            Close
          </button>
        </div>

        {selectedCharge ? (
          <div className="mx-8 mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
                  Paying open charge
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {formatChargeKindLabel(String(selectedCharge.kind))} · due{" "}
                  {formatDateLabel(selectedCharge.due_date)}
                </p>

                <p className="mt-1 text-sm leading-6 text-neutral-400">
                  This modal was opened from a charge row. The payment amount is
                  prefilled using that charge’s remaining balance.
                </p>
              </div>

              <div className="inline-flex items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-3 py-1.5 text-sm font-medium text-cyan-100">
                {formatMoneyDisplay(selectedCharge.remaining_balance)}
              </div>
            </div>
          </div>
        ) : openCharges.length ? (
          <div className="mx-8 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-sm leading-6 text-neutral-300">
              This will record a general lease payment. Open charges available:{" "}
              <span className="font-medium text-white">{openCharges.length}</span>.
            </p>
          </div>
        ) : null}

        <form className="space-y-7 px-8 py-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>Amount</span>

              <input
                autoComplete="off"
                className={FIELD_CLASS_NAME}
                inputMode="decimal"
                onChange={(event) => {
                  handleFieldChange("amount", event.target.value);
                }}
                placeholder="0.00"
                type="text"
                value={formState.amount}
              />
            </label>

            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>Paid at</span>

              <input
                className={FIELD_CLASS_NAME}
                onChange={(event) => {
                  handleFieldChange("paidAt", event.target.value);
                }}
                type="date"
                value={formState.paidAt}
              />
            </label>

            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>Payment method</span>

              <select
                className={FIELD_CLASS_NAME}
                onChange={(event) => {
                  handleFieldChange("method", event.target.value);
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

            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>Allocation mode</span>

              <select
                className={FIELD_CLASS_NAME}
                onChange={(event) => {
                  handleFieldChange("allocationMode", event.target.value);
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

              <p className="text-xs leading-5 text-neutral-500">
                {activeAllocationModeDescription}
              </p>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>External reference</span>

              <input
                autoComplete="off"
                className={FIELD_CLASS_NAME}
                onChange={(event) => {
                  handleFieldChange("externalRef", event.target.value);
                }}
                placeholder="Check number, confirmation id, etc."
                type="text"
                value={formState.externalRef}
              />
            </label>

            <label className={LABEL_CLASS_NAME}>
              <span className={LABEL_TEXT_CLASS_NAME}>Notes</span>

              <input
                autoComplete="off"
                className={FIELD_CLASS_NAME}
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
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.08] px-4 py-4">
              <p className="text-sm leading-6 text-amber-100">
                Manual allocation is visible for future billing growth, but the
                charge-picking UI is not wired yet. Use{" "}
                <span className="font-medium">Auto allocate</span> or{" "}
                <span className="font-medium">Leave unapplied</span> for now.
              </p>
            </div>
          ) : null}

          {localError ? (
            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.08] px-4 py-4">
              <p className="text-sm leading-6 text-rose-100">{localError}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-800/80 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createPaymentMutation.isPending}
              onClick={handleOverlayClose}
              type="button"
            >
              Cancel
            </button>

            <button
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.10] px-5 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitDisabled}
              type="submit"
            >
              {createPaymentMutation.isPending
                ? "Recording..."
                : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}