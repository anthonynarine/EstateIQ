// # Filename: src/features/leases/forms/TenantSection.tsx
// ✅ New Code

import TenantSelect from "../../tenants/components/TenantSelect";

type Props = {
  // Step 1: Data + control
  orgSlug: string;
  tenantId: number | null;
  onChange: (tenantId: number | null) => void;

  // Step 2: Copy (keeps CreateLeaseForm clean and makes future UX swaps easy)
  label?: string;
  helperText?: string;
};

/**
 * TenantSection
 *
 * Presentational tenant selector section used inside lease forms.
 *
 * Current behavior (Phase A: select-only):
 * - Renders a TenantSelect dropdown to attach a primary tenant to the lease.
 * - Does not create tenants yet (inline create comes later).
 *
 * Responsibilities:
 * - Provide a stable UI boundary around tenant selection
 * - Keep CreateLeaseForm focused on orchestration (payload + submit)
 *
 * Non-responsibilities:
 * - No API calls or query logic (TenantSelect owns fetching tenants)
 * - No validation normalization (handled by parent form utilities)
 * - No lease payload building (parent orchestrator)
 *
 * Why this matters:
 * - We will later upgrade this component to support "Select existing" vs
 *   "Create new" tenant modes without touching lease creation logic.
 */
export default function TenantSection({
  orgSlug,
  tenantId,
  onChange,
  label = "Primary tenant (optional)",
  helperText = "Pick the tenant for this lease. You can add full tenant management next.",
}: Props) {
  return (
    <TenantSelect
      orgSlug={orgSlug}
      tenantId={tenantId}
      onChange={onChange}
      label={label}
      helperText={helperText}
    />
  );
}