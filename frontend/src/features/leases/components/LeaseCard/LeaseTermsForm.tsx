// # Filename: src/features/leases/components/LeaseCard/LeaseTermsForm.tsx

import type { LeaseStatus } from "../../api/types";

interface LeaseTermsFormProps {
  startDate: string;
  endDate: string;
  rentAmount: string;
  securityDepositAmount: string;
  rentDueDay: string;
  status: LeaseStatus;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRentAmountChange: (value: string) => void;
  onSecurityDepositChange: (value: string) => void;
  onRentDueDayChange: (value: string) => void;
  onStatusChange: (value: LeaseStatus) => void;
}

/**
 * LeaseTermsForm
 *
 * Presentational lease terms form used inside the edit lease modal.
 */
export default function LeaseTermsForm({
  startDate,
  endDate,
  rentAmount,
  securityDepositAmount,
  rentDueDay,
  status,
  onStartDateChange,
  onEndDateChange,
  onRentAmountChange,
  onSecurityDepositChange,
  onRentDueDayChange,
  onStatusChange,
}: LeaseTermsFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">Start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">End date</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">Rent amount</span>
        <input
          inputMode="decimal"
          placeholder="e.g. 2500.00"
          value={rentAmount}
          onChange={(e) => onRentAmountChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">Security deposit</span>
        <input
          inputMode="decimal"
          placeholder="optional"
          value={securityDepositAmount}
          onChange={(e) => onSecurityDepositChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">Rent due day (1–28)</span>
        <input
          inputMode="numeric"
          value={rentDueDay}
          onChange={(e) => onRentDueDayChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-xs text-neutral-300">
        <span className="text-neutral-400">Status</span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as LeaseStatus)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-400/30"
        >
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="ended">ended</option>
        </select>
      </label>
    </div>
  );
}