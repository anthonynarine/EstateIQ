// # Filename: src/features/leases/forms/TenantSection/TenantCreatePanel.tsx

import type { TenantCreateDraft, TenantFieldErrors } from "./tenantTypes";

type Props = {
  // Step 1: Controlled draft
  draft: TenantCreateDraft;
  onChange: (draft: TenantCreateDraft) => void;

  // Step 2: Field errors (optional)
  fieldErrors?: TenantFieldErrors;
};

/**
 * TenantCreatePanel
 *
 * Presentational panel for creating a new tenant inline.
 *
 * Responsibilities:
 * - Render draft inputs (full_name required; email/phone optional)
 * - Display field-level validation errors for draft inputs
 *
 * Non-responsibilities:
 * - No API calls
 * - No submit orchestration
 */
export default function TenantCreatePanel({ draft, onChange, fieldErrors }: Props) {
  const setDraftField = (field: keyof TenantCreateDraft, value: string) => {
    onChange({ ...draft, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="space-y-1 md:col-span-2">
        <div className="text-xs text-neutral-300">Full name *</div>
        <input
          type="text"
          value={draft.full_name}
          onChange={(e) => setDraftField("full_name", e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors?.full_name?.length ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
          placeholder="e.g. John Doe"
        />
        {fieldErrors?.full_name?.length ? (
          <div className="text-[11px] text-red-300">{fieldErrors.full_name.join(" ")}</div>
        ) : null}
      </label>

      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Email (optional)</div>
        <input
          type="email"
          value={draft.email}
          onChange={(e) => setDraftField("email", e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors?.email?.length ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
          placeholder="tenant@email.com"
        />
        {fieldErrors?.email?.length ? (
          <div className="text-[11px] text-red-300">{fieldErrors.email.join(" ")}</div>
        ) : null}
      </label>

      <label className="space-y-1">
        <div className="text-xs text-neutral-300">Phone (optional)</div>
        <input
          type="tel"
          value={draft.phone}
          onChange={(e) => setDraftField("phone", e.target.value)}
          className={[
            "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
            fieldErrors?.phone?.length ? "border-red-500/60" : "border-neutral-800",
          ].join(" ")}
          placeholder="555-555-5555"
        />
        {fieldErrors?.phone?.length ? (
          <div className="text-[11px] text-red-300">{fieldErrors.phone.join(" ")}</div>
        ) : null}
      </label>

      <div className="md:col-span-2 text-[11px] text-neutral-500">
        Tenant will be created and attached as <span className="text-neutral-300">primary</span>{" "}
        when you submit the lease.
      </div>
    </div>
  );
}