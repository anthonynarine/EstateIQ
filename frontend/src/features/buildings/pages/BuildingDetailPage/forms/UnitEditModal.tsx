// # Filename: src/features/buildings/pages/BuildingDetailPage/forms/UnitEditModal.tsx


import React from "react";

export type UnitEditValue = {
  label: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
};

type Props = {
  isOpen: boolean;
  unitDisplayName: string;
  value: UnitEditValue;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: () => void;

  /**
   * onChange
   *
   * Caller owns state. We accept partial updates so parent hooks/pages can
   * update a single field without re-building the whole object every time.
   */
  onChange: (next: Partial<UnitEditValue>) => void;
};

/**
 * UnitEditModal
 *
 * Presentational-only edit modal for Unit fields.
 *
 * Responsibilities:
 * - Render controlled inputs from `value`
 * - Emit partial updates through `onChange`
 * - Surface server/mutation error text via `errorMessage`
 * - Prevent interaction while saving (`isSaving`)
 *
 * Non-responsibilities:
 * - No fetching, no mutations, no business rules, no parsing
 */
export default function UnitEditModal({
  isOpen,
  unitDisplayName,
  value,
  isSaving,
  errorMessage,
  onClose,
  onSubmit,
  onChange,
}: Props) {
  // Step 1: Don't render unless open (keeps DOM clean + avoids accidental tab traps)
  if (!isOpen) return null;

  const canSubmit = value.label.trim().length > 0 && !isSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-edit-title"
      aria-describedby="unit-edit-description"
      onMouseDown={(e) => {
        // Step 2: Close on backdrop click (only if user clicked the backdrop itself)
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id="unit-edit-title" className="text-lg font-semibold text-white">
              Edit unit
            </div>
            <div
              id="unit-edit-description"
              className="mt-1 text-sm text-neutral-400"
            >
              Editing <span className="text-white">{unitDisplayName}</span>. Building
              cannot be changed.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70">Label</label>
            <input
              value={value.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">Bedrooms</label>
            <input
              inputMode="decimal"
              value={value.bedrooms}
              onChange={(e) => onChange({ bedrooms: e.target.value })}
              placeholder="e.g., 2 or 2.5"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">Bathrooms</label>
            <input
              inputMode="decimal"
              value={value.bathrooms}
              onChange={(e) => onChange({ bathrooms: e.target.value })}
              placeholder="e.g., 1 or 1.5"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70">Square feet</label>
            <input
              inputMode="numeric"
              value={value.sqft}
              onChange={(e) => onChange({ sqft: e.target.value })}
              placeholder="e.g., 850"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}