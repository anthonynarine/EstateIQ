// # Filename: src/org/OrgSwitcher.tsx

import React, { useCallback, useMemo } from "react";
import { useOrg } from "./useOrg";

type Org = {
  id: number;
  name: string;
  slug: string;
};

/**
 * OrgSwitcher
 *
 * Allows the user to change the active organization (orgSlug).
 *
 * Production behavior:
 * - Disables while orgs are loading
 * - Handles empty org list gracefully (though DashboardLayout should show CreateOrgCard)
 * - Persists selection via OrgProvider (localStorage)
 *
 * Why this matters:
 * - X-Org-Slug scopes all multi-tenant API requests
 * - Switching org must reliably update the active orgSlug everywhere
 */
export default function OrgSwitcher() {
  const orgCtx = useOrg() as any;

  const orgs: Org[] = orgCtx?.orgs ?? [];
  const orgSlug: string = orgCtx?.orgSlug ?? "";
  const isLoadingOrgs: boolean = Boolean(orgCtx?.isLoadingOrgs);

  const setOrgSlug: (slug: string) => void =
    orgCtx?.setOrgSlug ?? (() => undefined);

  // Step 1: Resolve selected option (ensure it exists in list)
  const selectedSlug = useMemo(() => {
    if (!orgSlug) return "";
    const exists = orgs.some((o) => o.slug === orgSlug);
    return exists ? orgSlug : "";
  }, [orgSlug, orgs]);

  // Step 2: Change handler
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;
      setOrgSlug(next);
    },
    [setOrgSlug]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-xs text-zinc-500">Org</span>

      <select
        className="min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50"
        value={selectedSlug}
        onChange={handleChange}
        disabled={isLoadingOrgs || orgs.length === 0}
        aria-label="Select organization"
      >
        {/* Step 3: Loading / empty states */}
        {isLoadingOrgs ? (
          <option value="">Loading orgs…</option>
        ) : orgs.length === 0 ? (
          <option value="">No orgs</option>
        ) : (
          <option value="" disabled>
            Select org…
          </option>
        )}

        {/* Step 4: Orgs */}
        {orgs.map((o) => (
          <option key={o.id} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
