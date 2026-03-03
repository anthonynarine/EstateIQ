// # Filename: src/features/buildings/pages/BuildingDetailPage/forms/UnitDeleteConfirmModal.tsx

import React from "react";

type Props = {
  isOpen: boolean;
  unitDisplayName: string;
  errorMessage?: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * UnitDeleteConfirmModal
 *
 * Presentational confirmation modal for hard-deleting a Unit.
 *
 * Responsibilities:
 * - Render a focused, accessible "are you sure?" UI.
 * - Display server-provided error messages (e.g., 409 integrity blocks).
 * - Disable actions while deletion is in-flight.
 *
 * Non-responsibilities:
 * - No data fetching, no mutation calls, no state management.
 * - No business rules (those live in hooks/services).
 */
export default function UnitDeleteConfirmModal({
  isOpen,
  unitDisplayName,
  errorMessage,
  isDeleting,
  onClose,
  onConfirm,
}: Props) {
  // Step 1: Don't render unless open (avoids tab-trap + unnecessary DOM)
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-delete-title"
      aria-describedby="unit-delete-description"
      onMouseDown={(e) => {
        // Step 2: Close on backdrop click (only if user clicked the backdrop itself)
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id="unit-delete-title" className="text-lg font-semibold text-white">
              Delete unit
            </div>
            <div
              id="unit-delete-description"
              className="mt-2 text-sm text-neutral-400"
            >
              This will permanently delete{" "}
              <span className="text-white">{unitDisplayName}</span>.
              <span className="mt-1 block">
                If the unit has lease history (active or past), deletion may be blocked.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500/90 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}