// # Filename: src/features/tenancy/components/TenantsTable.tsx
// ✅ New Code
import React, { useMemo } from "react";

export type Tenant = {
  id: number | string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type TenantsTableProps = {
  tenants?: Tenant[]; // may be undefined while loading
  isLoading?: boolean;
  error?: unknown;
  onViewTenant?: (tenantId: Tenant["id"]) => void;
};

function getDisplayName(t: Tenant): string {
  // Step 1: Prefer full_name if backend provides it
  if (t.full_name && t.full_name.trim()) return t.full_name.trim();

  // Step 2: Fall back to first + last
  const first = (t.first_name || "").trim();
  const last = (t.last_name || "").trim();
  const combined = `${first} ${last}`.trim();

  // Step 3: Final fallback
  return combined || `Tenant #${t.id}`;
}

export default function TenantsTable({
  tenants,
  isLoading = false,
  error = null,
  onViewTenant,
}: TenantsTableProps) {
  // Step 1: Always map over an array (never undefined)
  const safeTenants = tenants ?? [];

  // Step 2: Compute rows once
  const rows = useMemo(() => {
    return safeTenants.map((t) => ({
      id: t.id,
      name: getDisplayName(t),
      email: t.email || "—",
      phone: t.phone || "—",
      status: t.status || "—",
    }));
  }, [safeTenants]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-white/80">
        Loading tenants…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-black/40 p-4 text-red-200">
        <div className="font-semibold">Couldn’t load tenants</div>
        <div className="mt-1 text-sm text-red-200/80">
          This usually happens if no org is selected (missing X-Org-Slug) or the request failed.
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-white/80">
        No tenants yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-white/70">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-t border-white/10 text-white/90">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-white/80">{r.email}</td>
                <td className="px-4 py-3 text-white/80">{r.phone}</td>
                <td className="px-4 py-3 text-white/80">{r.status}</td>
                <td className="px-4 py-3 text-right">
                  {onViewTenant ? (
                    <button
                      type="button"
                      onClick={() => onViewTenant(r.id)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-xs text-white/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}