// # Filename: src/features/tenants/components/TenantSelect.tsx
import { useMemo } from "react";
import { useTenantsQuery } from "../hooks/useTenantsQuery";

/**
 * TenantSelect
 *
 * Purpose:
 * - Lets the user choose the PRIMARY tenant for a lease.
 * - Reads tenants from the org-scoped TanStack Query cache.
 *
 * Why this is its own component:
 * - CreateLeaseForm and EditLeaseModal will both need the same picker.
 * - Keeps org-scoping + loading/error UI standardized in one place.
 *
 * Behavior:
 * - Shows a select dropdown.
 * - Supports "no tenant selected" (tenantId = null).
 * - Emits selected tenantId via onChange.
 */
type Props = {
  orgSlug: string;
  tenantId: number | null;
  onChange: (tenantId: number | null) => void;
  label?: string;
  helperText?: string;
};

export default function TenantSelect({
  orgSlug,
  tenantId,
  onChange,
  label = "Primary tenant",
  helperText = "Select the tenant for this lease (optional for now).",
}: Props) {
  const { data, isLoading, isError, error, refetch } = useTenantsQuery(orgSlug);

  // Step 1: Stable sorting for dropdown UX
  const options = useMemo(() => {
    const tenants = data ?? [];
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [data]);

  // Step 2: Render states (enterprise: helpful, not noisy)
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-sm text-white/70">Loading tenants…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
        <p className="text-sm text-white/80">Couldn’t load tenants.</p>
        <p className="mt-1 text-xs text-white/60">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          type="button"
          onClick={async () => {
            await refetch();
          }}
          className="mt-2 rounded-xl border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <label className="block text-xs font-medium text-white/80">{label}</label>

      <select
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
        value={tenantId ?? ""}
        onChange={(e) => {
          // Step 3: Convert empty option -> null (no tenant)
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
      >
        <option value="">No tenant selected</option>

        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
            {t.email ? ` — ${t.email}` : ""}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-white/60">{helperText}</p>
    </div>
  );
}