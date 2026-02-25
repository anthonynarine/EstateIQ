// # Filename: src/features/buildings/components/CreateBuildingForm.tsx

import type React from "react";
import Field from "./Field";

export type BuildingFormValue = {
  name: string;
  address_line1: string;
  address_line2: string; // UI: always string
  city: string;
  state: string;
  postal_code: string;
  country: string; // UI: always string
  notes: string; // UI: always string
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

export default function CreateBuildingForm({
  value,
  errors,
  onChangeField,
  onSubmit,
  onCancel,
  isSubmitting,
  errorText,
}: Props) {
  // Step 1: Render
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/90">Create building</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs text-white/80 hover:bg-white/5"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {errorText ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {errorText}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Name"
          value={value.name}
          onChange={(v) => onChangeField("name", v)}
        />
        {errors?.name ? <p className="text-xs text-red-200">{errors.name}</p> : null}

        <Field
          label="Address line 1"
          value={value.address_line1}
          onChange={(v) => onChangeField("address_line1", v)}
        />
        {errors?.address_line1 ? (
          <p className="text-xs text-red-200">{errors.address_line1}</p>
        ) : null}

        <Field
          label="Address line 2"
          value={value.address_line2}
          onChange={(v) => onChangeField("address_line2", v)}
        />

        <Field label="City" value={value.city} onChange={(v) => onChangeField("city", v)} />
        {errors?.city ? <p className="text-xs text-red-200">{errors.city}</p> : null}

        <Field
          label="State"
          value={value.state}
          onChange={(v) => onChangeField("state", v)}
        />
        {errors?.state ? <p className="text-xs text-red-200">{errors.state}</p> : null}

        <Field
          label="Postal code"
          value={value.postal_code}
          onChange={(v) => onChangeField("postal_code", v)}
        />
        {errors?.postal_code ? (
          <p className="text-xs text-red-200">{errors.postal_code}</p>
        ) : null}
      </div>
    </form>
  );
}