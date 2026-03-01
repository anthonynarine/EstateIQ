// # Filename: src/features/leases/forms/TenantSection/TenantSection.tsx


import type { TenantCreateDraft, TenantFieldErrors, TenantMode } from "./tenantTypes";
import TenantModeToggle from "./TenantModeToggle";
import TenantSelectPanel from "./TenantSelectPanel";
import TenantCreatePanel from "./TenantCreatePanel";

type Props = {
  // Step 1: Org context
  orgSlug: string;

  // Step 2: Mode (Phase B)
  mode: TenantMode;
  onModeChange: (mode: TenantMode) => void;

  // Step 3: Select existing
  tenantId: number | null;
  onChangeTenantId: (tenantId: number | null) => void;

  // Step 4: Create draft
  createDraft: TenantCreateDraft;
  onCreateDraftChange: (draft: TenantCreateDraft) => void;
  createFieldErrors?: TenantFieldErrors;

  // Step 5: Copy overrides
  title?: string;
  helperText?: string;
};

/**
 * TenantSection
 *
 * Orchestrator for tenant selection inside CreateLeaseForm.
 *
 * Responsibilities:
 * - Render the overall tenant card shell
 * - Switch between select/create panels based on mode
 * - Keep the form visually consistent and easy to extend
 *
 * Non-responsibilities:
 * - No API calls (create tenant / create lease handled elsewhere)
 */
export default function TenantSection({
  orgSlug,
  mode,
  onModeChange,
  tenantId,
  onChangeTenantId,
  createDraft,
  onCreateDraftChange,
  createFieldErrors,
  title = "Tenant",
  helperText = "Attach a tenant to this lease. Select an existing tenant or create a new one inline.",
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-neutral-400">{helperText}</div>
      </div>

      <TenantModeToggle mode={mode} onModeChange={onModeChange} />

      {mode === "select" ? (
        <TenantSelectPanel orgSlug={orgSlug} tenantId={tenantId} onChange={onChangeTenantId} />
      ) : (
        <TenantCreatePanel
          draft={createDraft}
          onChange={onCreateDraftChange}
          fieldErrors={createFieldErrors}
        />
      )}
    </div>
  );
}