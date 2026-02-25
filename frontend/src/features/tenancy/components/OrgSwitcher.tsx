
// # Filename: src/org/OrgSwitcher.tsx

import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";

type Org = {
  id: number;
  name: string;
  slug: string;
};

const CREATE_SENTINEL = "__create__";

/**
 * OrgSwitcher
 *
 * Allows the user to:
 * - switch active orgSlug
 * - trigger "Create new org" flow without needing a separate route
 *
 * UX:
 * - We navigate to /dashboard?createOrg=1 to reveal CreateOrgCard.
 */
export default function OrgSwitcher() {
  const orgCtx = useOrg() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const orgs: Org[] = orgCtx?.orgs ?? [];
  const orgSlug: string = orgCtx?.orgSlug ?? "";
  const isLoadingOrgs: boolean = Boolean(orgCtx?.isLoadingOrgs);
  const setOrgSlug: (slug: string | null) => void = orgCtx?.setOrgSlug ?? (() => undefined);

  // Step 1: resolve selected option
  const selectedSlug = useMemo(() => {
    if (!orgSlug) return "";
    const exists = orgs.some((o) => o.slug === orgSlug);
    return exists ? orgSlug : "";
  }, [orgSlug, orgs]);

  const withSearch = (path: string) => `${path}${location.search}`;

  // Step 2: change handler
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;

      if (next === CREATE_SENTINEL) {
        // Step 3: Open org creation flow on dashboard without breaking current org
        const params = new URLSearchParams(location.search);
        params.set("createOrg", "1");
        navigate(`/dashboard?${params.toString()}`, { replace: true });
        return;
      }

      setOrgSlug(next || null);
    },
    [location.search, navigate, setOrgSlug]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-xs text-zinc-500">Org</span>

      <select
        className="min-w-[200px] rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50"
        value={selectedSlug}
        onChange={handleChange}
        disabled={isLoadingOrgs || orgs.length === 0}
        aria-label="Select organization"
      >
        {isLoadingOrgs ? (
          <option value="">Loading orgs…</option>
        ) : orgs.length === 0 ? (
          <option value="">No orgs</option>
        ) : (
          <option value="" disabled>
            Select org…
          </option>
        )}

        {orgs.map((o) => (
          <option key={o.id} value={o.slug}>
            {o.name}
          </option>
        ))}

        {/* Step 4: Create new org entry */}
        <option value={CREATE_SENTINEL}>+ Create new org…</option>
      </select>
    </div>
  );
}