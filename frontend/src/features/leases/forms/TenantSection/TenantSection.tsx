// # Filename: src/features/leases/forms/TenantSection.tsx


import TenantSelect from "../../../tenants/components/TenantSelect";
import type { TenantCreateDraft, TenantFieldErrors, TenantMode } from "./tenantTypes";

type Props = {
  // Step 1: Org context for tenant directory fetching
  orgSlug: string;

  // Step 2: Tenant UX state
  tenantMode: TenantMode;
  tenantId: number | null;
  tenantCreateDraft: TenantCreateDraft;

  // Step 3: Tenant UX actions (from hook)
  enterCreateTenantMode: () => void;
  selectExistingTenant: (tenantId: number | null) => void;
  onCreateDraftChange: (draft: TenantCreateDraft) => void;

  // Step 4: Optional inline-create field errors (used later with API normalization)
  createFieldErrors?: TenantFieldErrors;

  // Step 5: Copy
  label?: string;
  helperText?: string;
};

/**
 * TenantSection
 *
 * Best-UX tenant chooser for lease creation.
 *
 * UI behavior:
 * - Default path is selecting an existing tenant via dropdown.
 * - A lightweight action "+ Create new tenant…" switches the section into create mode.
 * - Create mode expands inline inputs (full name required; email/phone optional).
 * - User can switch back via "Use existing instead".
 *
 * Responsibilities:
 * - Render tenant selection and inline creation inputs
 * - Keep a single, clean interaction surface (dropdown + one link)
 *
 * Non-responsibilities:
 * - No API calls (tenant creation orchestration comes later)
 * - No server error parsing (errors are passed in as props)
 */
export default function TenantSection({
  orgSlug,
  tenantMode,
  tenantId,
  tenantCreateDraft,
  enterCreateTenantMode,
  selectExistingTenant,
  onCreateDraftChange,
  createFieldErrors,
  label = "Tenant",
  helperText = "Attach a tenant to this lease. Choose an existing tenant or create a new one inline.",
}: Props) {
  const isCreateMode = tenantMode === "create";

  const setDraftField = (field: keyof TenantCreateDraft, value: string) => {
    // Step 1: Update draft immutably
    onCreateDraftChange({
      ...tenantCreateDraft,
      [field]: value,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-neutral-400">{helperText}</div>
      </div>

      {/* Step 2: Primary tenant chooser */}
      <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
        <div className="text-xs font-medium text-neutral-200">Primary tenant</div>

        <TenantSelect
          orgSlug={orgSlug}
          tenantId={isCreateMode ? null : tenantId}
          onChange={(id) => selectExistingTenant(id)}
          label={undefined}
          helperText="Select the tenant who will be primary on this lease."
        />

        <div className="flex items-center justify-between">
          {!isCreateMode ? (
            <button
              type="button"
              onClick={enterCreateTenantMode}
              className="text-xs text-neutral-300 underline-offset-4 hover:text-white hover:underline"
            >
              + Create new tenant…
            </button>
          ) : (
            <div className="text-xs text-neutral-400">
              Creating a new tenant (will be attached as primary)
            </div>
          )}

          {isCreateMode ? (
            <button
              type="button"
              onClick={() => selectExistingTenant(null)}
              className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
            >
              Use existing instead
            </button>
          ) : null}
        </div>
      </div>

      {/* Step 3: Inline create fields */}
      {isCreateMode ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <div className="text-xs text-neutral-300">Full name *</div>
            <input
              type="text"
              value={tenantCreateDraft.full_name}
              onChange={(e) => setDraftField("full_name", e.target.value)}
              className={[
                "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
                createFieldErrors?.full_name?.length
                  ? "border-red-500/60"
                  : "border-neutral-800",
              ].join(" ")}
              placeholder="e.g. John Doe"
            />
            {createFieldErrors?.full_name?.length ? (
              <div className="text-[11px] text-red-300">
                {createFieldErrors.full_name.join(" ")}
              </div>
            ) : null}
          </label>

          <label className="space-y-1">
            <div className="text-xs text-neutral-300">Email (optional)</div>
            <input
              type="email"
              value={tenantCreateDraft.email}
              onChange={(e) => setDraftField("email", e.target.value)}
              className={[
                "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
                createFieldErrors?.email?.length
                  ? "border-red-500/60"
                  : "border-neutral-800",
              ].join(" ")}
              placeholder="e.g. tenant@email.com"
            />
            {createFieldErrors?.email?.length ? (
              <div className="text-[11px] text-red-300">
                {createFieldErrors.email.join(" ")}
              </div>
            ) : null}
          </label>

          <label className="space-y-1">
            <div className="text-xs text-neutral-300">Phone (optional)</div>
            <input
              type="tel"
              value={tenantCreateDraft.phone}
              onChange={(e) => setDraftField("phone", e.target.value)}
              className={[
                "w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600",
                createFieldErrors?.phone?.length
                  ? "border-red-500/60"
                  : "border-neutral-800",
              ].join(" ")}
              placeholder="e.g. 555-555-5555"
            />
            {createFieldErrors?.phone?.length ? (
              <div className="text-[11px] text-red-300">
                {createFieldErrors.phone.join(" ")}
              </div>
            ) : null}
          </label>
        </div>
      ) : null}
    </div>
  );
}