// # Filename: src/features/leases/forms/LeaseTermsFields.tsx


import type { LeaseStatus } from "../api/leaseApi";
import FieldError from "./FieldError";

type FieldErrors = Record<string, string[] | undefined>;

type Props = {
  // Step 1: Values (string-based to match controlled inputs)
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;

  // Step 2: Change handlers (parent orchestrator owns state)
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRentAmountChange: (value: string) => void;
  onRentDueDayChange: (value: string) => void;
  onSecurityDepositChange: (value: string) => void;
  onStatusChange: (value: LeaseStatus) => void;

  // Step 3: Normalized API field errors (DRF -> { field: ["msg"] })
  fieldErrors: FieldErrors;
};

/**
 * LeaseTermsFields
 *
 * Presentational form section for core lease term inputs.
 *
 * Responsibilities:
 * - Renders the lease term inputs (dates, rent amount, due day, deposit, status)
 * - Shows field-level validation errors under their corresponding controls
 *
 * Non-responsibilities:
 * - No API calls, no org logic, no data normalization
 * - No mutation state or submit orchestration
 *
 * Why this structure:
 * - Keeps CreateLeaseForm as an orchestrator (thin, readable, testable)
 * - Makes the lease fields reusable in future flows (EditLease, RenewLease)
 */
export default function LeaseTermsFields({
  startDate,
  endDate,
  rentAmount,
  rentDueDay,
  securityDeposit,
  status,
  onStartDateChange,
  onEndDateChange,
  onRentAmountChange,
  onRentDueDayChange,
  onSecurityDepositChange,
  onStatusChange,
  fieldErrors,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* Start date */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Start date *</div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.start_date ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        />
        <FieldError messages={fieldErrors.start_date} />
      </label>

      {/* End date */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">End date (optional)</div>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.end_date ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        />
        <FieldError messages={fieldErrors.end_date} />
      </label>

      {/* Rent amount */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Rent amount *</div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 2500.00"
          value={rentAmount}
          onChange={(e) => onRentAmountChange(e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.rent_amount ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        />
        <FieldError messages={fieldErrors.rent_amount} />
        <div className="text-[11px] text-neutral-500">Send as a string (Decimal-safe).</div>
      </label>

      {/* Rent due day */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Rent due day</div>
        <input
          type="number"
          min={1}
          max={28}
          value={rentDueDay}
          onChange={(e) => onRentDueDayChange(e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.rent_due_day ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        />
        <FieldError messages={fieldErrors.rent_due_day} />
        <div className="text-[11px] text-neutral-500">Backend-enforced range: 1–28.</div>
      </label>

      {/* Security deposit */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Security deposit (optional)</div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 2500.00"
          value={securityDeposit}
          onChange={(e) => onSecurityDepositChange(e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.security_deposit_amount ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        />
        <FieldError messages={fieldErrors.security_deposit_amount} />
      </label>

      {/* Status */}
      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Status</div>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as LeaseStatus)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors.status ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
        >
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="ended">ended</option>
        </select>
        <FieldError messages={fieldErrors.status} />
      </label>
    </div>
  );
}