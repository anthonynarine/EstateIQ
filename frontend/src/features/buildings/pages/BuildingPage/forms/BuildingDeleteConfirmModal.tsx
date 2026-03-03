// # Filename: src/features/buildings/pages/BuildingPage/forms/BuildingDeleteConfirmModal.tsx

import React from "react";

type Props = {
  isOpen: boolean;
  buildingDisplayName: string;
  errorMessage?: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * BuildingDeleteConfirmModal
 *
 * Presentational confirmation modal for hard-deleting a Building.
 *
 * Responsibilities:
 * - Render a focused, accessible confirmation UI.
 * - Display server-provided error messages (e.g., integrity blocks).
 * - Disable actions while deletion is in-flight.
 *
 * Non-responsibilities:
 * - No API calls, no mutation hooks, no business rules.
 * - No state ownership beyond props.
 */
export default function BuildingDeleteConfirmModal({
  isOpen,
  buildingDisplayName,
  errorMessage,
  isDeleting,
  onClose,
  onConfirm,
}: Props) {
  // Step 1: Don't render unless open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="building-delete-title"
      aria-describedby="building-delete-description"
      onMouseDown={(e) => {
        // Step 2: Close on backdrop click (only if user clicked backdrop itself)
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              id="building-delete-title"
              className="text-lg font-semibold text-white"
            >
              Delete building
            </div>

            <div
              id="building-delete-description"
              className="mt-2 text-sm text-neutral-400"
            >
              This will permanently delete{" "}
              <span className="text-white">{buildingDisplayName}</span>.
              <span className="mt-1 block">
                If the building has units or lease history, deletion may be blocked.
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