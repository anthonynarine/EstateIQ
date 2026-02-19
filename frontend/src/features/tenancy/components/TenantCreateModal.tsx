// # Filename: src/features/tenancy/components/LeaseCreateModal.tsx

import { useEffect, useMemo, useState } from "react";
import type {
  CreateLeasePayload,
  LeaseStatus,
  Tenant,
} from "../types";

type Props = {
  isOpen: boolean;
  orgSlug: string;
  unitId: number;

  tenants: Tenant[];
  tenantsLoading: boolean;

  isSaving: boolean;
  errorMessage: string | null;

  onClose: () => void;

  /**
   * Called when the user submits a lease create request.
   *
   * Contract:
   * - Should throw on failure (so modal stays open)
   * - Should resolve on success (caller can close modal)
   */
  onCreate: (payload: CreateLeasePayload) => Promise<void>;
};

/**
 * LeaseCreateModal
 *
 * MVP rules:
 * - Create lease for a single unit (unitId fixed)
 * - Attach exactly one tenant as "primary"
 *
 * Why isolate this component:
 * - Keeps UnitLeasesPage orchestration-only (queries + open/close)
 * - Centralizes form validation + payload shaping
 */
export default function LeaseCreateModal({
  isOpen,
  orgSlug,
  unitId,
  tenants,
  tenantsLoading,
  isSaving,
  errorMessage,
  onClose,
  onCreate,
}: Props) {
  // Step 1: Form state
  const [startDate, setStartDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("draft");
  const [rentDueDay, setRentDueDay] = useState<string>("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [primaryTenantId, setPrimaryTenantId] = useState<string>("");

  // Step 2: Reset when opened
  useEffect(() => {
    if (!isOpen) return;

    setStartDate("");
    setRentAmount("");
    setStatus("draft");
    setRentDueDay("1");
    setSecurityDeposit("");
    setPrimaryTenantId("");
  }, [isOpen]);

  // Step 3: Local validation
  const canSubmit = useMemo(() => {
    const unitOk = Number.isFinite(unitId) && unitId > 0;
    const orgOk = Boolean(orgSlug);
    const startOk = Boolean(startDate);
    const rentOk = Boolean(rentAmount.trim());
    const tenantOk = Boolean(primaryTenantId);

    return unitOk && orgOk && startOk && rentOk && tenantOk && !isSaving;
  }, [unitId, orgSlug, startDate, rentAmount, primaryTenantId, isSaving]);

  const handleSubmit = async () => {
    // Step 4: Guard rails
    if (!canSubmit) return;

    // Step 5: Parse numbers safely
    const dueDayNum = rentDueDay ? Number(rentDueDay) : null;
    const dueDay =
      dueDayNum && Number.isFinite(dueDayNum) ? Math.min(31, Math.max(1, dueDayNum)) : null;

    const tenantIdNum = Number(primaryTenantId);

    // Step 6: Build backend write payload
    const payload: CreateLeasePayload = {
      unit: unitId,
      start_date: startDate,
      rent_amount: rentAmount.trim(),
      status,
      rent_due_day: dueDay,
      security_deposit_amount: securityDeposit.trim()
        ? securityDeposit.trim()
        : null,
      parties: [
        {
          tenant: tenantIdNum,
          role: "primary",
        },
      ],
    };

    try {
      // Step 7: Await mutation; on failure it should throw and stay open
      await onCreate(payload);

      // Step 8: Close on success
      onClose();
    } catch {
      // Step 9: Error message is rendered from errorMessage prop
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Create Lease</div>
            <div className="mt-1 text-sm text-zinc-400">
              Unit <span className="text-zinc-200">#{unitId}</span> • Org{" "}
              <span className="text-zinc-200">{orgSlug}</span>
            </div>
          </div>

          <button className="text-zinc-500 hover:text-zinc-200" onClick={onClose}>
            ✕
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-300">Start date</span>
            <input
              type="date"
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-300">Status</span>
            <select
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeaseStatus)}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="ended">ended</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-300">Rent amount</span>
            <input
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="2500.00"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-300">Rent due day</span>
            <input
              type="number"
              min={1}
              max={31}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
              value={rentDueDay}
              onChange={(e) => setRentDueDay(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-300">Security deposit (optional)</span>
            <input
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value)}
              placeholder="2500.00"
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-300">Primary tenant</span>
            <select
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-zinc-100 outline-none disabled:opacity-50"
              value={primaryTenantId}
              onChange={(e) => setPrimaryTenantId(e.target.value)}
              disabled={tenantsLoading}
            >
              <option value="">
                {tenantsLoading ? "Loading tenants…" : "Select a tenant"}
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.full_name} {t.email ? `• ${t.email}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isSaving ? "Saving…" : "Create Lease"}
          </button>
        </div>
      </div>
    </div>
  );
}
