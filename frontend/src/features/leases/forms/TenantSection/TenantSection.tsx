// # Filename: src/features/leases/forms/TenantSection/TenantSection.tsx

import TenantCreatePanel from "./TenantCreatePanel";
import TenantModeToggle from "./TenantModeToggle";
import TenantSelectPanel from "./TenantSelectPanel";
import type {
  TenantCreateDraft,
  TenantFieldErrors,
  TenantMode,
} from "./tenantTypes";

type Props = {
  orgSlug: string;
  tenantMode: TenantMode;
  tenantId: number | null;
  tenantCreateDraft: TenantCreateDraft;
  enterCreateTenantMode: () => void;
  selectExistingTenant: (tenantId: number | null) => void;
  onCreateDraftChange: (draft: TenantCreateDraft) => void;
  onTenantModeChange: (mode: TenantMode) => void;
  createFieldErrors?: TenantFieldErrors;
  label?: string;
  helperText?: string;
};

/**
 * TenantSection
 *
 * Premium tenant selection/creation section for lease creation.
 *
 * Responsibilities:
 * - Show a clear mode switch between existing vs new tenant
 * - Render either the select panel or create panel
 * - Keep a single, calm interaction surface
 */
export default function TenantSection({
  orgSlug,
  tenantMode,
  tenantId,
  tenantCreateDraft,
  enterCreateTenantMode,
  selectExistingTenant,
  onCreateDraftChange,
  onTenantModeChange,
  createFieldErrors,
  label = "Tenant",
  helperText = "Choose an existing tenant or create one inline before submitting the lease.",
}: Props) {
  const isCreateMode = tenantMode === "create";

  const handleModeChange = (mode: TenantMode) => {
    if (mode === "create") {
      enterCreateTenantMode();
      return;
    }

    onTenantModeChange("select");
  };

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-900/40">
      <div className="border-b border-neutral-800/80 px-5 py-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Tenant assignment
            </p>
            <h4 className="mt-1 text-lg font-semibold text-white">{label}</h4>
            <p className="mt-1 text-sm text-neutral-400">{helperText}</p>
          </div>

          <TenantModeToggle mode={tenantMode} onModeChange={handleModeChange} />
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {!isCreateMode ? (
          <TenantSelectPanel
            orgSlug={orgSlug}
            tenantId={tenantId}
            onChange={(id) => selectExistingTenant(id)}
            label="Primary tenant"
            helperText="Select the tenant who will be primary on this lease."
          />
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
              Creating a new tenant inline. The new tenant will be attached as
              the primary tenant when the lease is submitted.
            </div>

            <TenantCreatePanel
              draft={tenantCreateDraft}
              onChange={onCreateDraftChange}
              fieldErrors={createFieldErrors}
            />
          </>
        )}
      </div>
    </section>
  );
}