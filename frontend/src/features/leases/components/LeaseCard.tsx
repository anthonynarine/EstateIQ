// # Filename: src/features/leases/components/LeaseCard.tsx


import { useMemo, useState } from "react";
import type { Lease, LeaseStatus, UpdateLeaseInput } from "../api/leaseApi";
import { useUpdateLeaseMutation } from "../queries/useUpdateLeaseMutation";

type Props = {
  lease: Lease;
  orgSlug: string;
  unitId: number;
  compact?: boolean;
};

type FormState = {
  start_date: string;
  end_date: string; // empty string means null
  rent_amount: string;
  security_deposit_amount: string; // empty string means null
  rent_due_day: string; // keep string in UI
  status: LeaseStatus;
};

function formatMoney(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function normalizePatch(state: FormState): UpdateLeaseInput {
  const rentDueDay = Number(state.rent_due_day);

  return {
    start_date: state.start_date,
    end_date: state.end_date.trim() ? state.end_date.trim() : null,
    rent_amount: state.rent_amount.trim(),
    security_deposit_amount: state.security_deposit_amount.trim()
      ? state.security_deposit_amount.trim()
      : null,
    rent_due_day: Number.isFinite(rentDueDay) ? rentDueDay : undefined,
    status: state.status,
  };
}

function getDefaultFormState(lease: Lease): FormState {
  return {
    start_date: lease.start_date,
    end_date: lease.end_date ?? "",
    rent_amount: lease.rent_amount ?? "",
    security_deposit_amount: lease.security_deposit_amount ?? "",
    rent_due_day: String(lease.rent_due_day ?? 1),
    status: lease.status,
  };
}

/**
 * LeaseCard
 *
 * Shows lease summary + provides an "Edit" modal that PATCHes the lease.
 *
 * compact=true:
 * - Renders minimal row with Edit button (good for "Current lease" section)
 */
export default function LeaseCard({
  lease,
  orgSlug,
  unitId,
  compact = false,
}: Props) {
  // Step 1: Local modal state
  const [isOpen, setIsOpen] = useState(false);

  // Step 2: Local form state
  const [form, setForm] = useState<FormState>(() => getDefaultFormState(lease));

  // Step 3: Stable reset baseline
  const baseline = useMemo(() => getDefaultFormState(lease), [lease]);

  // Step 4: Mutation
  const updateMutation = useUpdateLeaseMutation({ orgSlug, unitId });

  const statusPill = (() => {
    if (lease.status === "active")
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    if (lease.status === "draft")
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    return "bg-neutral-500/10 text-neutral-300 border-neutral-500/30";
  })();

  const canSubmit = (() => {
    if (!form.start_date.trim()) return false;
    if (!form.rent_amount.trim()) return false;

    const rent = Number(form.rent_amount);
    if (!Number.isFinite(rent) || rent <= 0) return false;

    const due = Number(form.rent_due_day);
    if (!Number.isFinite(due) || due < 1 || due > 28) return false;

    if (form.end_date.trim() && form.end_date.trim() < form.start_date.trim())
      return false;

    if (form.status === "ended" && !form.end_date.trim()) return false;

    return true;
  })();

  const apiErrorMessage =
    updateMutation.error instanceof Error ? updateMutation.error.message : null;

  const onClose = () => {
    setIsOpen(false);
    setForm(baseline);
  };

  const onOpen = () => {
    setForm(baseline);
    setIsOpen(true);
  };

  const onSubmit = async () => {
    const patch = normalizePatch(form);

    try {
      await updateMutation.mutateAsync({ leaseId: lease.id, patch });
      setIsOpen(false);
    } catch {
      // error renders below
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-white">
              Lease #{lease.id}
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${statusPill}`}
            >
              {lease.status.toUpperCase()}
            </span>
          </div>

          {/* ✅ New Code: compact mode hides the big details grid */}
          {!compact ? (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-neutral-300">
              <div>
                <div className="text-neutral-500">Start</div>
                <div className="text-neutral-200">{lease.start_date || "—"}</div>
              </div>
              <div>
                <div className="text-neutral-500">End</div>
                <div className="text-neutral-200">{lease.end_date ?? "—"}</div>
              </div>
              <div>
                <div className="text-neutral-500">Rent</div>
                <div className="text-neutral-200">
                  ${formatMoney(lease.rent_amount)}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Due day</div>
                <div className="text-neutral-200">{lease.rent_due_day}</div>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-neutral-400">
              Edit this lease to change rent, dates, due day, or status.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
        >
          Edit
        </button>
      </div>

      {/* Modal */}
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Edit lease</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Unit #{unitId} • Lease #{lease.id}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">Start date</span>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </label>

              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">End date</span>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </label>

              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">Rent amount</span>
                <input
                  inputMode="decimal"
                  placeholder="e.g. 2500.00"
                  value={form.rent_amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rent_amount: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </label>

              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">Security deposit</span>
                <input
                  inputMode="decimal"
                  placeholder="optional"
                  value={form.security_deposit_amount}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      security_deposit_amount: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </label>

              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">Rent due day (1–28)</span>
                <input
                  inputMode="numeric"
                  value={form.rent_due_day}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rent_due_day: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </label>

              <label className="space-y-1 text-xs text-neutral-300">
                <span className="text-neutral-400">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as LeaseStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="ended">ended</option>
                </select>
              </label>
            </div>

            {apiErrorMessage ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                Failed to update lease.
                <div className="mt-1 text-red-200/80">{apiErrorMessage}</div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(baseline)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900"
                disabled={updateMutation.isPending}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || updateMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}