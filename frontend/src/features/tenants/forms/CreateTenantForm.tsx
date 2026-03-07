// # Filename: src/features/tenants/forms/CreateTenantForm.tsx

import { useMemo, useState } from "react";
import type { CreateTenantInput } from "../api/types";

export type TenantFormValue = {
  full_name: string;
  email: string;
  phone: string;
};

type Props = {
  isSaving?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: CreateTenantInput) => Promise<void> | void;
  onCancel?: () => void;
};

/**
 * normalizeOptionalText
 *
 * Converts a text input into:
 * - trimmed string
 * - null when empty
 */
function normalizeOptionalText(value: string): string | null {
  // Step 1: Trim whitespace
  const trimmed = value.trim();

  // Step 2: Empty becomes null
  return trimmed ? trimmed : null;
}

/**
 * validateTenantFormValue
 *
 * Local UI validation for tenant creation/editing.
 *
 * Product rule for now:
 * - full name is required
 * - at least one contact method is required:
 *   - email
 *   - phone
 *
 * This is UI validation only.
 * Backend validation must still enforce the real rule.
 */
export function validateTenantFormValue(value: TenantFormValue): string | null {
  // Step 1: Full name required
  if (!value.full_name.trim()) {
    return "Full name is required.";
  }

  // Step 2: Require at least one contact method
  const hasEmail = Boolean(value.email.trim());
  const hasPhone = Boolean(value.phone.trim());

  if (!hasEmail && !hasPhone) {
    return "Provide at least one contact method: email or phone.";
  }

  return null;
}

/**
 * CreateTenantForm
 *
 * Stateful create form for the Tenant directory.
 *
 * Responsibilities:
 * - Own local input state
 * - Perform lightweight UI validation
 * - Normalize payload before emitting submit
 * - Surface API/server error text from parent
 *
 * Non-responsibilities:
 * - No direct API calls here
 * - No query invalidation here
 * - No org lookup here
 */
export default function CreateTenantForm({
  isSaving = false,
  errorMessage = null,
  onSubmit,
  onCancel,
}: Props) {
  // Step 1: Local form state
  const [value, setValue] = useState<TenantFormValue>({
    full_name: "",
    email: "",
    phone: "",
  });

  // Step 2: Local UX validation state
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 3: Derived submit state
  const canSubmit = useMemo(() => {
    return !isSaving;
  }, [isSaving]);

  // Step 4: Shared input styles
  const inputClassName =
    "mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20";

  const handleFieldChange = (
    key: keyof TenantFormValue,
    nextValue: string,
  ) => {
    setValue((prev) => ({
      ...prev,
      [key]: nextValue,
    }));

    // Step 5: Clear local validation noise as user corrects fields
    if (localError) {
      setLocalError(null);
    }
  };

  const resetForm = () => {
    setValue({
      full_name: "",
      email: "",
      phone: "",
    });
    setLocalError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Step 6: Local validation first
    const validationError = validateTenantFormValue(value);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    // Step 7: Build normalized payload
    const payload: CreateTenantInput = {
      full_name: value.full_name.trim(),
      email: normalizeOptionalText(value.email),
      phone: normalizeOptionalText(value.phone),
    };

    try {
      // Step 8: Delegate submit to parent
      await onSubmit(payload);

      // Step 9: Reset on success
      resetForm();
    } catch {
      // Parent owns server error rendering.
    }
  };

  return (
    <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Tenant creation
          </p>

          <h3 className="text-lg font-semibold tracking-tight text-white">
            Add tenant
          </h3>

          <p className="text-sm text-neutral-400">
            Create a reusable tenant record for lease assignment and future
            billing workflows.
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          {(localError || errorMessage) && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {localError ?? errorMessage}
            </div>
          )}

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40">
            <div className="border-b border-neutral-800 px-5 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Tenant identity
                </p>

                <h4 className="text-lg font-semibold text-white">
                  Basic information
                </h4>

                <p className="text-sm text-neutral-400">
                  Keep tenant records minimal and useful. Right now we only store
                  name and contact information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-300">
                  Full name <span className="text-red-300">*</span>
                </label>
                <input
                  value={value.full_name}
                  onChange={(e) => handleFieldChange("full_name", e.target.value)}
                  placeholder="e.g. John Doe"
                  className={inputClassName}
                />
                <div className="mt-2 text-xs text-neutral-500">
                  Use the tenant’s full legal or commonly used name.
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Email
                </label>
                <input
                  type="email"
                  value={value.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="e.g. john@example.com"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Phone
                </label>
                <input
                  value={value.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  className={inputClassName}
                />
              </div>

              <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Validation rule
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  A tenant must have a full name and at least one contact method:
                  email or phone.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-2xl border border-neutral-700 bg-transparent px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}