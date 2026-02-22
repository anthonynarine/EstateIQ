// # Filename: src/org/OrgProvider.tsx

import  { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { useOrgsQuery } from "../queries/useOrgsQuery";

type Org = {
  id: number;
  name: string;
  slug: string;
};

type OrgContextValue = {
  orgSlug: string;
  orgs: Org[];
  isLoadingOrgs: boolean;

  /**
   * Sets active org slug (persisted).
   */
  setOrgSlug: (slug: string) => void;

  /**
   * Clears active org selection (rare; used for logout/edge-cases).
   */
  clearOrgSlug: () => void;
};

export const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "estateiq.active_org_slug";

/**
 * OrgProvider
 *
 * Responsibilities:
 * - Fetch org list (server state) via TanStack Query
 * - Persist active org selection (localStorage)
 * - Auto-select an org on first load:
 *   - If a persisted orgSlug exists and is valid -> use it
 *   - Else select first org in list (stable default)
 *
 * Why this matters:
 * - Almost every backend endpoint requires X-Org-Slug
 * - Centralizing org selection prevents feature pages from handling org setup
 */
export default function OrgProvider({ children }: { children: React.ReactNode }) {
  // Step 1: Server state (org list)
  const orgsQuery = useOrgsQuery();
  const orgs = orgsQuery.data ?? [];

  // Step 2: Local active org (persisted)
  const [orgSlug, _setOrgSlug] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  });

  // Step 3: Persist setter
  const setOrgSlug = useCallback((slug: string) => {
    const next = (slug || "").trim();
    _setOrgSlug(next);

    if (next) {
      localStorage.setItem(STORAGE_KEY, next);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearOrgSlug = useCallback(() => {
    setOrgSlug("");
  }, [setOrgSlug]);

  // Step 4: Auto-select orgSlug when org list loads/changes
  useEffect(() => {
    if (orgsQuery.isLoading) return;
    if (orgs.length === 0) return;

    // Step 4a: If current orgSlug is valid, keep it
    const currentValid = orgSlug
      ? orgs.some((o) => o.slug === orgSlug)
      : false;

    if (currentValid) return;

    // Step 4b: If persisted slug is invalid (org removed) or empty,
    // default to first org (stable UX).
    setOrgSlug(orgs[0].slug);
  }, [orgs, orgsQuery.isLoading, orgSlug, setOrgSlug]);

  // Step 5: Memoize context value
  const value = useMemo<OrgContextValue>(() => {
    return {
      orgSlug,
      orgs,
      isLoadingOrgs: orgsQuery.isLoading,
      setOrgSlug,
      clearOrgSlug,
    };
  }, [orgSlug, orgs, orgsQuery.isLoading, setOrgSlug, clearOrgSlug]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
