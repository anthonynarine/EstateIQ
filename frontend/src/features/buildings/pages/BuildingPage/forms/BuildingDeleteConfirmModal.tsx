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
 * Premium presentational confirmation modal for hard-deleting a Building.
 *
 * Responsibilities:
 * - Render a focused, accessible confirmation UI
 * - Display server-provided error messages
 * - Disable actions while deletion is in-flight
 *
 * Non-responsibilities:
 * - No API calls
 * - No mutation hooks
 * - No business rules
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="building-delete-title"
      aria-describedby="building-delete-description"
      onMouseDown={(e) => {
        // Step 2: Close on backdrop click only
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Building workspace
              </p>

              <div
                id="building-delete-title"
                className="text-xl font-semibold tracking-tight text-white"
              >
                Delete building
              </div>

              <div
                id="building-delete-description"
                className="text-sm text-neutral-400"
              >
                You are about to permanently delete{" "}
                <span className="text-white">{buildingDisplayName}</span>.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="text-sm font-medium text-rose-200">
              This action cannot be undone.
            </div>
            <div className="mt-2 text-sm text-rose-100/90">
              If this building still has units, active leases, or historical
              records, deletion may be blocked.
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-800/80 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete building"}
          </button>
        </div>
      </div>
    </div>
  );
}