// # Filename: src/features/leases/forms/TenantSection/TenantSelectPanel.tsx
// ✅ New Code

import TenantSelect from "../../../tenants/components/selectors/TenantSelect";

type Props = {
  // Step 1: Org context
  orgSlug: string;

  // Step 2: Controlled selection
  tenantId: number | null;
  onChange: (tenantId: number | null) => void;

  // Step 3: Copy (optional)
  label?: string;
  helperText?: string;
};

/**
 * TenantSelectPanel
 *
 * Presentational wrapper for selecting an existing tenant.
 *
 * Responsibilities:
 * - Render TenantSelect inside a softer, lighter workflow surface
 * - Keep copy and spacing consistent with the lease workspace
 *
 * Important:
 * - This wrapper improves surrounding visual weight
 * - If the opened dropdown popup is still bright, the true fix is inside the
 *   TenantSelect implementation itself, especially if it uses a native select
 */
export default function TenantSelectPanel({
  orgSlug,
  tenantId,
  onChange,
  label = "Primary tenant",
  helperText = "Select the tenant who will be primary on this lease.",
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-sm leading-6 text-neutral-400">{helperText}</p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-neutral-950/60 p-3 transition-colors duration-200 focus-within:border-cyan-400/20 focus-within:bg-neutral-950/80">
        <TenantSelect
          orgSlug={orgSlug}
          tenantId={tenantId}
          onChange={onChange}
          label=""
          helperText=""
        />
      </div>
    </div>
  );
}