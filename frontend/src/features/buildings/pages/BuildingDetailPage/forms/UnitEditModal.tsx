// # Filename: src/features/buildings/pages/BuildingDetailPage/forms/UnitEditModal.tsx
// ✅ New Code

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
 * Premium presentational-only edit modal for Unit fields.
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
  // Step 1: Don't render unless open
  if (!isOpen) return null;

  // Step 2: Derived state
  const canSubmit = value.label.trim().length > 0 && !isSaving;

  const inputClassName =
    "mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-edit-title"
      aria-describedby="unit-edit-description"
      onMouseDown={(e) => {
        // Step 3: Close on backdrop click only
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Unit workspace
              </p>

              <div
                id="unit-edit-title"
                className="text-xl font-semibold tracking-tight text-white"
              >
                Edit unit
              </div>

              <div
                id="unit-edit-description"
                className="text-sm text-neutral-400"
              >
                Editing <span className="text-white">{unitDisplayName}</span>.
                Building cannot be changed here.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <section className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-4 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-white">
                Unit details
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Update the unit label and basic physical details.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Label
                </label>
                <input
                  value={value.label}
                  onChange={(e) => onChange({ label: e.target.value })}
                  placeholder="e.g., B1, 2A, Basement"
                  className={inputClassName}
                />
                <div className="mt-1 text-[11px] text-neutral-500">
                  Must remain unique within this building.
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Bedrooms
                </label>
                <input
                  inputMode="decimal"
                  value={value.bedrooms}
                  onChange={(e) => onChange({ bedrooms: e.target.value })}
                  placeholder="e.g., 2 or 2.5"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Bathrooms
                </label>
                <input
                  inputMode="decimal"
                  value={value.bathrooms}
                  onChange={(e) => onChange({ bathrooms: e.target.value })}
                  placeholder="e.g., 1 or 1.5"
                  className={inputClassName}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Square feet
                </label>
                <input
                  inputMode="numeric"
                  value={value.sqft}
                  onChange={(e) => onChange({ sqft: e.target.value })}
                  placeholder="e.g., 850"
                  className={inputClassName}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-800/80 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}