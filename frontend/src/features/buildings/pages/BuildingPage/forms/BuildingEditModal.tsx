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
 * Premium presentational-only modal for editing Building fields.
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
  if (!isOpen) return null;

  const canSubmit = value.name.trim().length > 0 && !isSaving;

  const inputClassName =
    "mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="building-edit-title"
      aria-describedby="building-edit-description"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Building workspace
              </p>

              <div
                id="building-edit-title"
                className="text-xl font-semibold tracking-tight text-white"
              >
                Edit building
              </div>

              <div
                id="building-edit-description"
                className="text-sm text-neutral-400"
              >
                Editing <span className="text-white">{buildingDisplayName}</span>.
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
                Building details
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Update the building identity and address information.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Name
                </label>
                <input
                  value={value.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className={inputClassName}
                  placeholder="e.g., Ocean View Duplex"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Building type
                </label>
                <input
                  value={value.building_type}
                  onChange={(e) => onChange({ building_type: e.target.value })}
                  className={inputClassName}
                  placeholder="e.g., house, duplex"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Country
                </label>
                <input
                  value={value.country}
                  onChange={(e) => onChange({ country: e.target.value })}
                  className={inputClassName}
                  placeholder="e.g., US"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Address line 1
                </label>
                <input
                  value={value.address_line1}
                  onChange={(e) => onChange({ address_line1: e.target.value })}
                  className={inputClassName}
                  placeholder="Street address"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Address line 2
                </label>
                <input
                  value={value.address_line2}
                  onChange={(e) => onChange({ address_line2: e.target.value })}
                  className={inputClassName}
                  placeholder="Apt, Suite, Floor (optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  City
                </label>
                <input
                  value={value.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                  className={inputClassName}
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  State
                </label>
                <input
                  value={value.state}
                  onChange={(e) => onChange({ state: e.target.value })}
                  className={inputClassName}
                  placeholder="State"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Postal code
                </label>
                <input
                  value={value.postal_code}
                  onChange={(e) => onChange({ postal_code: e.target.value })}
                  className={inputClassName}
                  placeholder="Postal code"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-800/80 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}