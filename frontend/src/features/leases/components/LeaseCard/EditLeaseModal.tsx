// # Filename: src/features/leases/components/LeaseCard/EditLeaseModal.tsx

import { UserRound } from "lucide-react";
import type { Lease } from "../../api/types";
import { formatDateRange } from "./formatters";

interface EditLeaseModalProps {
  isOpen: boolean;
  lease: Lease;
  unitId: number;
  showDbId?: boolean;
  tenantName: string;
  missingPrimaryTenant: boolean;
  localError?: string | null;
  apiErrorMessage?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onReset: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * EditLeaseModal
 *
 * Presentational modal shell for lease editing.
 * The inner form fields are passed as children.
 */
export default function EditLeaseModal({
  isOpen,
  lease,
  unitId,
  showDbId = false,
  tenantName,
  missingPrimaryTenant,
  localError,
  apiErrorMessage,
  isSubmitting = false,
  onClose,
  onReset,
  onSubmit,
  children,
}: EditLeaseModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/65"
      />

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Edit lease</h3>
            <p className="mt-1 text-xs text-neutral-400">
              Unit #{unitId} •{" "}
              {formatDateRange(lease.start_date, lease.end_date)}
              {showDbId ? ` • Lease #${lease.id}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-2">
              <UserRound className="h-4 w-4 text-cyan-300" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                Current primary tenant
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  missingPrimaryTenant ? "text-amber-200" : "text-white"
                }`}
              >
                {tenantName}
              </p>

              {missingPrimaryTenant ? (
                <p className="mt-1 text-xs text-amber-200/85">
                  This lease must be repaired with a primary tenant before safe
                  saving is allowed.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4">{children}</div>

        {localError ? (
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
            {localError}
          </div>
        ) : null}

        {apiErrorMessage ? (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
            Failed to update lease.
            <div className="mt-1 text-red-200/80">{apiErrorMessage}</div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10"
            disabled={isSubmitting}
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}