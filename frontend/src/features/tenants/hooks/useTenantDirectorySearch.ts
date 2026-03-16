// # Filename: src/features/tenants/hooks/useTenantDirectorySearch.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";

type UseTenantDirectorySearchParams = {
  orgSlug: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  debounceMs?: number;
};

type BuildRouteParamsArgs = {
  page?: number;
  search?: string;
};

/**
 * normalizeTenantDirectorySearch
 *
 * Normalizes free-text search so the UI and URL stay stable.
 *
 * Args:
 *   value: Raw user-entered search input.
 *
 * Returns:
 *   A trimmed, whitespace-collapsed search string.
 */
export function normalizeTenantDirectorySearch(value: string): string {
  // Step 1: Trim leading/trailing whitespace
  const trimmed = value.trim();

  // Step 2: Collapse repeated internal whitespace
  return trimmed.replace(/\s+/g, " ");
}

/**
 * buildTenantDirectoryRouteParams
 *
 * Builds canonical tenant directory URL params from the current workspace state.
 *
 * Args:
 *   orgSlug: Active organization slug.
 *   search: Committed search query.
 *   page: Optional page number.
 *
 * Returns:
 *   A URLSearchParams instance with only meaningful params.
 */
function buildTenantDirectoryRouteParams({
  orgSlug,
  search,
  page,
}: {
  orgSlug: string;
  search: string;
  page?: number;
}): URLSearchParams {
  const nextParams = new URLSearchParams();

  // Step 1: Preserve org scope
  if (orgSlug) {
    nextParams.set("org", orgSlug);
  }

  // Step 2: Preserve normalized search only when present
  const normalizedSearch = normalizeTenantDirectorySearch(search);
  if (normalizedSearch) {
    nextParams.set("search", normalizedSearch);
  }

  // Step 3: Persist page only when greater than 1
  if (page && page > 1) {
    nextParams.set("page", String(page));
  }

  return nextParams;
}

/**
 * useTenantDirectorySearch
 *
 * Owns the tenant directory search workflow:
 * - buffered input
 * - debounced URL commit
 * - page reset on search change
 * - clear search behavior
 * - route param generation for pagination
 * - explicit "is searching" UI state
 *
 * This keeps the page and presentational components simpler while preserving
 * route-backed state for future server-side search.
 */
export default function useTenantDirectorySearch({
  orgSlug,
  searchParams,
  setSearchParams,
  debounceMs = 450,
}: UseTenantDirectorySearchParams) {
  const committedSearch = useMemo(() => {
    return normalizeTenantDirectorySearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(committedSearch);

  const normalizedSearchInput = useMemo(() => {
    return normalizeTenantDirectorySearch(searchInput);
  }, [searchInput]);

  // Step 1: Keep the local input aligned with committed route state
  useEffect(() => {
    setSearchInput(committedSearch);
  }, [committedSearch]);

  const commitSearchToRoute = useCallback(
    (nextSearch: string) => {
      const nextParams = buildTenantDirectoryRouteParams({
        orgSlug,
        search: nextSearch,
      });

      // Step 2: Replace history during debounce-driven search updates
      setSearchParams(nextParams, { replace: true });
    },
    [orgSlug, setSearchParams]
  );

  const clearSearch = useCallback(() => {
    // Step 3: Reset local input immediately
    setSearchInput("");

    // Step 4: Avoid unnecessary route writes
    if (!committedSearch) {
      return;
    }

    // Step 5: Clear committed search and reset pagination
    commitSearchToRoute("");
  }, [committedSearch, commitSearchToRoute]);

  // Step 6: Debounce input into route-backed committed search
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (normalizedSearchInput === committedSearch) {
        return;
      }

      // Step 7: Commit new search and implicitly reset page to 1
      commitSearchToRoute(normalizedSearchInput);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    normalizedSearchInput,
    committedSearch,
    commitSearchToRoute,
    debounceMs,
  ]);

  const hasSearchInput = normalizedSearchInput.length > 0;
  const hasCommittedSearch = committedSearch.length > 0;
  const isSearchDirty = normalizedSearchInput !== committedSearch;

  /**
   * buildRouteParams
   *
   * Builds canonical route params for pagination and follow-up actions.
   *
   * Args:
   *   page: Optional target page.
   *   search: Optional explicit search override.
   *
   * Returns:
   *   Canonical URLSearchParams for the tenant directory.
   */
  const buildRouteParams = useCallback(
    ({ page, search }: BuildRouteParamsArgs = {}) => {
      return buildTenantDirectoryRouteParams({
        orgSlug,
        search: search ?? committedSearch,
        page,
      });
    },
    [orgSlug, committedSearch]
  );

  return {
    searchInput,
    setSearchInput,
    clearSearch,
    committedSearch,
    normalizedSearchInput,
    hasSearchInput,
    hasCommittedSearch,
    isSearchDirty,
    isSearching: isSearchDirty,
    buildRouteParams,
  };
}