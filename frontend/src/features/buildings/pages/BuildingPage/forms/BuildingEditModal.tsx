// # Filename: src/features/buildings/pages/BuildingPage/forms/BuildingEditModal.tsx


import React from "react";

export type BuildingEditValue = {
  name: string;
  building_type: string;
  country: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
};

type Props = {
  isOpen: boolean;
  buildingDisplayName: string;
  value: BuildingEditValue;
  onChange: (next: Partial<BuildingEditValue>) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
};

/**
 * BuildingEditModal
 *
 * Presentational-only modal for editing Building fields.
 *
 * Responsibilities:
 * - Render a controlled form using `value`
 * - Emit partial updates via `onChange`
 * - Surface server errors via `errorMessage`
 * - Disable actions while saving
 *
 * Non-responsibilities:
 * - No fetching/mutations
 * - No org/business rules
 */
export default function BuildingEditModal({
  isOpen,
  buildingDisplayName,
  value,
  onChange,
  onClose,
  onSubmit,
  isSaving,
  errorMessage,
}: Props) {
  // Step 1: Don't render unless open
  if (!isOpen) return null;

  const canSubmit = value.name.trim().length > 0 && !isSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="building-edit-title"
      aria-describedby="building-edit-description"
      onMouseDown={(e) => {
        // Step 2: Close on backdrop click (only if user clicked backdrop itself)
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id="building-edit-title" className="text-lg font-semibold text-white">
              Edit building
            </div>
            <div
              id="building-edit-description"
              className="mt-1 text-sm text-neutral-400"
            >
              Editing <span className="text-white">{buildingDisplayName}</span>.
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
            <label className="block text-xs font-medium text-white/70">Name</label>
            <input
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., Ocean View Duplex"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">
              Building type
            </label>
            <input
              value={value.building_type}
              onChange={(e) => onChange({ building_type: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., house, duplex"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">Country</label>
            <input
              value={value.country}
              onChange={(e) => onChange({ country: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="e.g., US"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70">
              Address line 1
            </label>
            <input
              value={value.address_line1}
              onChange={(e) => onChange({ address_line1: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="Street address"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70">
              Address line 2
            </label>
            <input
              value={value.address_line2}
              onChange={(e) => onChange({ address_line2: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="Apt, Suite, Floor (optional)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">City</label>
            <input
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">State</label>
            <input
              value={value.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70">
              Postal code
            </label>
            <input
              value={value.postal_code}
              onChange={(e) => onChange({ postal_code: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}