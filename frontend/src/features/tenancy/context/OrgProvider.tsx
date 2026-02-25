
// # Filename: src/features/tenancy/context/OrgProvider.tsx

import type React from "react";
import { createContext, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "../../../api/axios";
import { tokenStorage } from "../../../auth/tokenStorage";

export type Org = {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
};

type OrgContextValue = {
  /**
   * Active organization slug.
   *
   * Canonical source of truth:
   * - URL param `?org=<slug>` when present
   * - falls back to tokenStorage (for first-load / legacy links)
   */
  orgSlug: string | null;

  /**
   * Orgs available to the current user (orgless endpoint).
   * Used by OrgSwitcher + onboarding.
   */
  orgs: Org[];

  /**
   * Orgs loading state (for disabling switcher).
   */
  isLoadingOrgs: boolean;

  /**
   * Sets active org slug.
   * Updates URL + tokenStorage and invalidates org-scoped query cache.
   */
  setOrgSlug: (slug: string | null) => void;

  /**
   * Refetch org list (after create, etc.).
   */
  refetchOrgs: () => void;
};

export const OrgContext = createContext<OrgContextValue | null>(null);

async function fetchOrgs(): Promise<Org[]> {
  // Step 1: Orgless endpoint (axios should NOT attach X-Org-Slug here)
  const res = await api.get<Org[]>("/api/v1/orgs/");
  return res.data;
}

/**
 * OrgProvider
 *
 * Mobile-first, URL-canonical org selection + org list for switching.
 *
 * Key principles:
 * - orgSlug comes from URL (fallback: tokenStorage)
 * - org-scoped query keys start with ["org", orgSlug, ...]
 * - org list comes from orgless endpoint to power switcher + onboarding
 */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Step 1: Derive orgSlug (URL wins, storage fallback)
  const urlOrg = searchParams.get("org");
  const storedOrg = tokenStorage.getOrgSlug();
  const orgSlug = urlOrg || storedOrg || null;

  // Step 2: Load org list (orgless endpoint)
  const orgsQuery = useQuery({
    queryKey: ["orgs"],
    queryFn: fetchOrgs,
    staleTime: 30_000,
  });

  const orgs = orgsQuery.data ?? [];
  const isLoadingOrgs = orgsQuery.isLoading;

  const refetchOrgs = useCallback(() => {
    void orgsQuery.refetch();
  }, [orgsQuery]);

  // Step 3: If URL is missing org but storage has one, canonicalize URL once
  useEffect(() => {
    if (!urlOrg && storedOrg) {
      const next = new URLSearchParams(searchParams);
      next.set("org", storedOrg);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrg, storedOrg, setSearchParams]);

  // Step 4: Invalidate org-scoped cache (prevents cross-tenant bleed)
  const invalidateOrgScopedQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key.length > 0 && key[0] === "org";
      },
    });
  }, [queryClient]);

  // Step 5: Setter updates URL + storage (no local state needed)
  const setOrgSlug = useCallback(
    (slug: string | null) => {
      if (slug) tokenStorage.setOrgSlug(slug);
      else tokenStorage.clearOrgSlug();

      const next = new URLSearchParams(searchParams);

      if (slug) next.set("org", slug);
      else next.delete("org");

      setSearchParams(next, { replace: true });
      invalidateOrgScopedQueries();
    },
    [invalidateOrgScopedQueries, searchParams, setSearchParams]
  );

  const value = useMemo(
    () => ({
      orgSlug,
      orgs,
      isLoadingOrgs,
      setOrgSlug,
      refetchOrgs,
    }),
    [orgSlug, orgs, isLoadingOrgs, setOrgSlug, refetchOrgs]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}