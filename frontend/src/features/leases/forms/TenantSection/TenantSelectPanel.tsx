// # Filename: src/features/leases/forms/TenantSection/TenantSelectPanel.tsx


import TenantSelect from "../../../tenants/components/TenantSelect";

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
 * Presentational panel for selecting an existing tenant.
 *
 * Responsibilities:
 * - Render TenantSelect with consistent labels/copy
 *
 * Non-responsibilities:
 * - No API calls (TenantSelect handles querying)
 * - No lease orchestration logic
 */
export default function TenantSelectPanel({
  orgSlug,
  tenantId,
  onChange,
  label = "Primary tenant",
  helperText = "Select the tenant who will be primary on this lease.",
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