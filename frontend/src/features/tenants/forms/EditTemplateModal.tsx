// # Filename: src/features/tenants/forms/EditTenantModal.tsx
// ✅ New Code

import type { TenantFormValue } from "./CreateTenantForm";
import { validateTenantFormValue } from "./CreateTenantForm";

type Props = {
  isOpen: boolean;
  tenantDisplayName: string;
  value: TenantFormValue;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (next: Partial<TenantFormValue>) => void;
};

/**
 * EditTenantModal
 *
 * Premium presentational-only edit modal for tenant fields.
 *
 * Responsibilities:
 * - Render controlled inputs from `value`
 * - Emit partial updates through `onChange`
 * - Surface server/mutation errors from parent
 * - Prevent unsafe close while saving
 *
 * Non-responsibilities:
 * - No fetching
 * - No mutation execution
 * - No org resolution
 */
export default function EditTenantModal({
  isOpen,
  tenantDisplayName,
  value,
  isSaving,
  errorMessage,
  onClose,
  onSubmit,
  onChange,
}: Props) {
  // Step 1: Guard closed state
  if (!isOpen) return null;

  // Step 2: Derived state
  const localValidationError = validateTenantFormValue(value);
  const canSubmit = !isSaving && !localValidationError;

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-edit-title"
      aria-describedby="tenant-edit-description"
      onMouseDown={(event) => {
        // Step 3: Close only on true backdrop click
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Tenant workspace
              </p>

              <div
                id="tenant-edit-title"
                className="text-xl font-semibold tracking-tight text-white"
              >
                Edit tenant
              </div>

              <div
                id="tenant-edit-description"
                className="text-sm text-neutral-400"
              >
                Editing <span className="text-white">{tenantDisplayName}</span>.
                Tenant residence history is controlled by leases, not by editing
                the tenant record directly. That keeps the data model aligned with
                lease-driven history. :contentReference[oaicite:4]{index=4}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="space-y-6">
            {(localValidationError || errorMessage) && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {errorMessage ?? localValidationError}
              </div>
            )}

            <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40">
              <div className="border-b border-neutral-800 px-5 py-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Tenant identity
                  </p>

                  <h4 className="text-lg font-semibold text-white">
                    Update contact information
                  </h4>

                  <p className="text-sm text-neutral-400">
                    Keep the directory clean and reusable for leasing, billing,
                    and delinquency workflows. Tenants CRUD is part of the core
                    leasing MVP, so this edit path should stay lean and reliable. :contentReference[oaicite:5]{index=5}
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
                    onChange={(e) =>
                      onChange({ full_name: e.target.value })
                    }
                    placeholder="e.g. John Doe"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={value.email}
                    onChange={(e) => onChange({ email: e.target.value })}
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
                    onChange={(e) => onChange({ phone: e.target.value })}
                    placeholder="e.g. (555) 123-4567"
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Edit rule
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    Full name is required, and the tenant must keep at least one
                    contact method on file.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-2xl border border-neutral-700 bg-transparent px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}