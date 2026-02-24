// ✅ New Code
// # Filename: src/features/tenancy/context/OrgProvider.tsx

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { tokenStorage } from "../../../auth/tokenStorage";

/**
 * OrgContextValue
 *
 * Organization selection state for multi-tenant routing and request scoping.
 *
 * Canonical rule:
 * - URL query param `?org=<slug>` is the source of truth.
 * - tokenStorage is a fallback (first load / legacy links / refresh).
 *
 * Why this exists:
 * - Keeps org selection deterministic (URL-driven).
 * - Allows axios to attach `X-Org-Slug` centrally from tokenStorage.
 * - Allows React Query keys to be tenant-safe and invalidate cleanly.
 */
export type OrgContextValue = {
  /**
   * Active organization slug or null if none selected.
   */
  orgSlug: string | null;

  /**
   * Sets the active org slug.
   *
   * Side effects:
   * - Writes slug to tokenStorage (so axios can attach X-Org-Slug)
   * - Updates URL query string (?org=...)
   * - Invalidates org-scoped React Query cache entries
   */
  setOrgSlug: (slug: string | null) => void;
};

export const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * useOrg
 *
 * Typed accessor for OrgContext.
 *
 * Guarantees:
 * - Provides a stable, strongly-typed interface
 * - Throws a clear error if called outside <OrgProvider />
 *
 * This prevents silent "undefined context" bugs in production.
 */
export function useOrg(): OrgContextValue {
  // Step 1: Read context
  const ctx = useContext(OrgContext);

  // Step 2: Fail fast if provider is missing
  if (!ctx) {
    throw new Error("useOrg must be used within <OrgProvider />.");
  }

  return ctx;
}

/**
 * OrgProvider
 *
 * URL-canonical organization selection provider.
 *
 * Key design:
 * - orgSlug is *derived* from URL/search params + storage fallback.
 * - We avoid duplicating orgSlug into React state, which prevents
 *   effect-driven synchronization loops and state cascade warnings.
 *
 * Multi-tenant boundary:
 * - orgSlug is persisted to tokenStorage so axios can attach `X-Org-Slug`.
 * - Queries are invalidated when org changes to prevent cache bleed.
 */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Step 1: Derive orgSlug (URL wins; tokenStorage fallback)
  const urlOrgSlug = searchParams.get("org");
  const storedOrgSlug = tokenStorage.getOrgSlug();
  const orgSlug = urlOrgSlug || storedOrgSlug || null;

  // Step 2: Canonicalize URL if missing org but storage has one
  useEffect(() => {
    if (!urlOrgSlug && storedOrgSlug) {
      const next = new URLSearchParams(searchParams);
      next.set("org", storedOrgSlug);
      setSearchParams(next, { replace: true });
    }
    // Intentionally omit searchParams from deps to avoid infinite URL rewrite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrgSlug, storedOrgSlug, setSearchParams]);

  const invalidateOrgScopedQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "org";
      },
    });
  }, [queryClient]);

  const setOrgSlug = useCallback(
    (slug: string | null) => {
      // Step 1: Persist for axios header attachment
      if (slug) tokenStorage.setOrgSlug(slug);
      else tokenStorage.clearOrgSlug();

      // Step 2: Update URL (canonical source of truth)
      const next = new URLSearchParams(searchParams);
      if (slug) next.set("org", slug);
      else next.delete("org");

      setSearchParams(next, { replace: true });

      // Step 3: Prevent cross-tenant cache bleed
      invalidateOrgScopedQueries();
    },
    [invalidateOrgScopedQueries, searchParams, setSearchParams]
  );

  const value = useMemo<OrgContextValue>(
    () => ({
      orgSlug,
      setOrgSlug,
    }),
    [orgSlug, setOrgSlug]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}