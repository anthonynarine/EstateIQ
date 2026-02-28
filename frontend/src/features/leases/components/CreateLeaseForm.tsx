// # Filename: src/features/leases/components/CreateLeaseForm.tsx

import { useMemo, useState } from "react";
import { useOrg } from "../../tenancy/hooks/useOrg";
import type { LeaseStatus } from "../api/leaseApi";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";

type Props = {
  unitId: number;
};

/**
 * CreateLeaseForm
 *
 * Mobile-first, expandable form to create a Lease under a Unit.
 *
 * Enterprise behaviors:
 * - Uses canonical orgSlug from OrgProvider (URL → tokenStorage sync).
 * - Uses TanStack Query mutation + deterministic invalidation (no manual refetch).
 * - Never allows spoofing `unit` from the UI layer (unit enforced inside mutation).
 * - Displays DRF validation errors clearly (field + non-field).
 */
export default function CreateLeaseForm({ unitId }: Props) {
  const { orgSlug } = useOrg();

  // Step 1: Expand/collapse state (keeps Building/Unit pages clean)
  const [isOpen, setIsOpen] = useState(false);

  // Step 2: UI form state is string-based (safe for inputs)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  // Step 3: Local UI error (in addition to API errors)
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 4: Guardrails
  const canRender = Boolean(orgSlug && orgSlug.trim().length > 0) && Number.isFinite(unitId);

  // Step 5: Mutation hook (org-scoped invalidation happens internally)
  const { mutateAsync, isPending, error } = useCreateLeaseMutation({
    orgSlug: orgSlug ?? "",
    unitId,
  });

  // Step 6: Normalize DRF/axios errors into something displayable
  const apiErrors = useMemo(() => {
    const data = (error as any)?.response?.data;

    if (!data || typeof data !== "object") {
      const msg =
        (error as any)?.message ||
        (typeof data === "string" ? data : null) ||
        null;
      return msg ? { _error: [msg] } : null;
    }

    // DRF usually returns: { field: ["msg"], non_field_errors: ["msg"] }
    return data as Record<string, string[] | string>;
  }, [error]);

  // Step 7: Helpers
  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setRentAmount("");
    setRentDueDay("1");
    setSecurityDeposit("");
    setStatus("active");
    setLocalError(null);
  };

  const parseOptionalNumberOrNull = (raw: string): number | null => {
    // Step 1: treat empty as null
    if (!raw || raw.trim() === "") return null;

    // Step 2: parse numeric input
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const normalizeMoneyString = (raw: string): string => {
    // Step 1: trim and keep as a decimal-safe string for DRF DecimalField
    return raw.trim();
  };

  const handleSubmit = async () => {
    // Step 1: Clear prior local errors
    setLocalError(null);

    // Step 2: Validate org + unit
    if (!orgSlug) {
      setLocalError("Organization not selected. Add ?org=<slug> to the URL.");
      return;
    }
    if (!Number.isFinite(unitId)) {
      setLocalError("Invalid unit id.");
      return;
    }

    // Step 3: Validate required fields
    if (!startDate.trim()) {
      setLocalError("Start date is required.");
      return;
    }
    if (!rentAmount.trim()) {
      setLocalError("Rent amount is required.");
      return;
    }

    // Step 4: Convert inputs to API payload (strings/nullable numbers)
    const dueDayNum = parseOptionalNumberOrNull(rentDueDay);
    if (dueDayNum == null) {
      setLocalError("Rent due day must be a valid number (1–31).");
      return;
    }
    if (dueDayNum < 1 || dueDayNum > 31) {
      setLocalError("Rent due day must be between 1 and 31.");
      return;
    }

    const payload = {
      start_date: startDate.trim(),
      end_date: endDate.trim() ? endDate.trim() : null,
      rent_amount: normalizeMoneyString(rentAmount),
      security_deposit_amount: securityDeposit.trim()
        ? normalizeMoneyString(securityDeposit)
        : null,
      rent_due_day: dueDayNum,
      status,
    };

    // Step 5: Execute mutation
    try {
      await mutateAsync(payload);

      // Step 6: Reset + collapse for a crisp UX
      resetForm();
      setIsOpen(false);
    } catch {
      // Step 7: No-op (errors are handled via `error` from mutation)
      // This keeps the flow deterministic and avoids double-handling.
    }
  };

  if (!canRender) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        Cannot create a lease without a selected org and a valid unit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Lease</div>
          <div className="text-xs text-neutral-400">
            Create a lease for this unit (org-scoped).
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
        >
          {isOpen ? "Close" : "Add lease"}
        </button>
      </div>

      {/* Expandable form */}
      {isOpen ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
          {/* Local Error */}
          {localError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
              {localError}
            </div>
          ) : null}

          {/* API Errors (DRF) */}
          {apiErrors ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200 space-y-2">
              <div className="font-semibold text-red-100">Validation error</div>
              <ul className="list-disc pl-5 space-y-1">
                {Object.entries(apiErrors).map(([key, val]) => {
                  const msgs = Array.isArray(val) ? val : [String(val)];
                  return msgs.map((m, idx) => (
                    <li key={`${key}-${idx}`}>
                      <span className="text-red-100">{key}:</span> {m}
                    </li>
                  ));
                })}
              </ul>
            </div>
          ) : null}

          {/* Fields */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Start date */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">Start date *</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              />
            </label>

            {/* End date */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">End date (optional)</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              />
            </label>

            {/* Rent amount */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">Rent amount *</div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2500.00"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              />
              <div className="text-[11px] text-neutral-500">
                Send as a string (Decimal-safe).
              </div>
            </label>

            {/* Due day */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">Rent due day</div>
              <input
                type="number"
                min={1}
                max={31}
                value={rentDueDay}
                onChange={(e) => setRentDueDay(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              />
            </label>

            {/* Security deposit */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">Security deposit (optional)</div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2500.00"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              />
            </label>

            {/* Status */}
            <label className="space-y-1">
              <div className="text-xs text-neutral-300">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeaseStatus)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
              >
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="ended">ended</option>
              </select>
              <div className="text-[11px] text-neutral-500">
                For demos, <span className="text-neutral-300">active</span> makes
                occupancy instant.
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg border border-neutral-700 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60"
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Create lease"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}