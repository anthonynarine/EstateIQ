// # Filename: src/features/buildings/pages/BuildingPage/forms/CreateBuildingForm.tsx


import type React from "react";
import Field from "../components/Field";

export type BuildingFormValue = {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  notes: string;
};

type Props = {
  value: BuildingFormValue;
  errors?: Partial<Record<keyof BuildingFormValue, string>>;
  onChangeField: <K extends keyof BuildingFormValue>(
    key: K,
    value: BuildingFormValue[K]
  ) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  isSubmitting: boolean;
  errorText?: string | null;
};

/**
 * CreateBuildingForm
 *
 * Premium presentational form for creating a building.
 *
 * Responsibilities:
 * - Render a structured building-creation workspace
 * - Surface field-level and form-level errors
 * - Keep actions anchored and easy to scan
 *
 * Non-responsibilities:
 * - Validation rules
 * - API calls
 * - Mutation orchestration
 */
export default function CreateBuildingForm({
  value,
  errors,
  onChangeField,
  onSubmit,
  onCancel,
  isSubmitting,
  errorText,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Building creation
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Add building
            </h2>
            <p className="max-w-2xl text-sm text-neutral-400">
              Create a building record for this organization. You can add units
              and manage leases after the building is created.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create building"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        {errorText ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorText}
          </div>
        ) : null}

        <section className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-4 sm:p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold text-white">
              Building details
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Start with the building name and physical address.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Name"
                value={value.name}
                onChange={(v) => onChangeField("name", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="e.g. Ocean View Duplex"
              />
              {errors?.name ? (
                <p className="mt-1 text-xs text-red-300">{errors.name}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <Field
                label="Address line 1"
                value={value.address_line1}
                onChange={(v) => onChangeField("address_line1", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="Street address"
              />
              {errors?.address_line1 ? (
                <p className="mt-1 text-xs text-red-300">
                  {errors.address_line1}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <Field
                label="Address line 2"
                value={value.address_line2}
                onChange={(v) => onChangeField("address_line2", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="Apt, Suite, Floor (optional)"
              />
            </div>

            <div>
              <Field
                label="City"
                value={value.city}
                onChange={(v) => onChangeField("city", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="City"
              />
              {errors?.city ? (
                <p className="mt-1 text-xs text-red-300">{errors.city}</p>
              ) : null}
            </div>

            <div>
              <Field
                label="State"
                value={value.state}
                onChange={(v) => onChangeField("state", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="State"
              />
              {errors?.state ? (
                <p className="mt-1 text-xs text-red-300">{errors.state}</p>
              ) : null}
            </div>

            <div>
              <Field
                label="Postal code"
                value={value.postal_code}
                onChange={(v) => onChangeField("postal_code", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="Postal code"
              />
              {errors?.postal_code ? (
                <p className="mt-1 text-xs text-red-300">
                  {errors.postal_code}
                </p>
              ) : null}
            </div>

            <div>
              <Field
                label="Country"
                value={value.country}
                onChange={(v) => onChangeField("country", v)}
                inputClassName="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                labelClassName="text-xs font-medium text-neutral-300"
                placeholder="US"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-4 sm:p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold text-white">
              Internal notes
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Optional notes for ownership, operations, or building context.
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Notes</span>
            <textarea
              value={value.notes}
              onChange={(e) => onChangeField("notes", e.target.value)}
              rows={4}
              placeholder="Optional notes..."
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-800/80 px-5 py-4 sm:px-6">
        <button
          type="button"
          className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create building"}
        </button>
      </div>
    </form>
  );
}