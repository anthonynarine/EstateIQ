// # Filename: src/features/leases/forms/LeaseTermsFields.tsx


import type { LeaseStatus } from "../../../api/leaseApi";
import FieldError from "./FieldError";

type FieldErrors = Record<string, string[] | undefined>;

type Props = {
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRentAmountChange: (value: string) => void;
  onRentDueDayChange: (value: string) => void;
  onSecurityDepositChange: (value: string) => void;
  onStatusChange: (value: LeaseStatus) => void;
  fieldErrors: FieldErrors;
};

/**
 * LeaseTermsFields
 *
 * Premium presentational section for core lease terms.
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
  const inputClass = (hasError?: boolean) =>
    [
      "w-full rounded-xl border bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-neutral-600",
      hasError ? "border-red-500/60" : "border-neutral-800",
    ].join(" ");

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-900/40">
      <div className="border-b border-neutral-800/80 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Lease terms
        </p>
        <h4 className="mt-1 text-lg font-semibold text-white">
          Dates, rent, and status
        </h4>
        <p className="mt-1 text-sm text-neutral-400">
          Define the lease period, payment schedule, and current status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">Start date *</div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={inputClass(Boolean(fieldErrors.start_date))}
          />
          <FieldError messages={fieldErrors.start_date} />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">
            End date (optional)
          </div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={inputClass(Boolean(fieldErrors.end_date))}
          />
          <FieldError messages={fieldErrors.end_date} />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">Rent amount *</div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 2500.00"
            value={rentAmount}
            onChange={(e) => onRentAmountChange(e.target.value)}
            className={inputClass(Boolean(fieldErrors.rent_amount))}
          />
          <FieldError messages={fieldErrors.rent_amount} />
          <div className="text-xs text-neutral-500">
            Decimal-safe string value sent to the backend.
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">Rent due day</div>
          <input
            type="number"
            min={1}
            max={28}
            value={rentDueDay}
            onChange={(e) => onRentDueDayChange(e.target.value)}
            className={inputClass(Boolean(fieldErrors.rent_due_day))}
          />
          <FieldError messages={fieldErrors.rent_due_day} />
          <div className="text-xs text-neutral-500">
            Allowed range is 1–28.
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">
            Security deposit (optional)
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 2500.00"
            value={securityDeposit}
            onChange={(e) => onSecurityDepositChange(e.target.value)}
            className={inputClass(Boolean(fieldErrors.security_deposit_amount))}
          />
          <FieldError messages={fieldErrors.security_deposit_amount} />
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">Status</div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as LeaseStatus)}
            className={inputClass(Boolean(fieldErrors.status))}
          >
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="ended">ended</option>
          </select>
          <FieldError messages={fieldErrors.status} />
        </label>
      </div>
    </section>
  );
}