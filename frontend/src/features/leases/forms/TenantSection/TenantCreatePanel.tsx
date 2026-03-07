// # Filename: src/features/leases/forms/TenantSection/TenantCreatePanel.tsx
// ✅ New Code

import type { TenantCreateDraft, TenantFieldErrors } from "./tenantTypes";

type Props = {
  draft: TenantCreateDraft;
  onChange: (draft: TenantCreateDraft) => void;
  fieldErrors?: TenantFieldErrors;
};

export default function TenantCreatePanel({
  draft,
  onChange,
  fieldErrors,
}: Props) {
  const setDraftField = (field: keyof TenantCreateDraft, value: string) => {
    onChange({ ...draft, [field]: value });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 sm:p-5">
      <div className="space-y-1">
        <h5 className="text-sm font-semibold text-white">New tenant details</h5>
        <p className="text-xs text-neutral-400">
          Enter the tenant details that should be created with this lease.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <div className="text-xs font-medium text-neutral-300">Full name *</div>
          <input
            type="text"
            value={draft.full_name}
            onChange={(e) => setDraftField("full_name", e.target.value)}
            className={[
              "w-full rounded-xl border bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-neutral-600",
              fieldErrors?.full_name?.length
                ? "border-red-500/60"
                : "border-neutral-800",
            ].join(" ")}
            placeholder="e.g. John Doe"
          />
          {fieldErrors?.full_name?.length ? (
            <div className="text-[11px] text-red-300">
              {fieldErrors.full_name.join(" ")}
            </div>
          ) : null}
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">
            Email (optional)
          </div>
          <input
            type="email"
            value={draft.email}
            onChange={(e) => setDraftField("email", e.target.value)}
            className={[
              "w-full rounded-xl border bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-neutral-600",
              fieldErrors?.email?.length
                ? "border-red-500/60"
                : "border-neutral-800",
            ].join(" ")}
            placeholder="tenant@email.com"
          />
          {fieldErrors?.email?.length ? (
            <div className="text-[11px] text-red-300">
              {fieldErrors.email.join(" ")}
            </div>
          ) : null}
        </label>

        <label className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">
            Phone (optional)
          </div>
          <input
            type="tel"
            value={draft.phone}
            onChange={(e) => setDraftField("phone", e.target.value)}
            className={[
              "w-full rounded-xl border bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition focus:border-neutral-600",
              fieldErrors?.phone?.length
                ? "border-red-500/60"
                : "border-neutral-800",
            ].join(" ")}
            placeholder="555-555-5555"
          />
          {fieldErrors?.phone?.length ? (
            <div className="text-[11px] text-red-300">
              {fieldErrors.phone.join(" ")}
            </div>
          ) : null}
        </label>
      </div>
    </div>
  );
}