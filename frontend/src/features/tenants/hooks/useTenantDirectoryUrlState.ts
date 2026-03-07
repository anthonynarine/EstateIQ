// # Filename: src/features/tenants/hooks/useTenantDirectoryUrlState.ts
// ✅ New Code

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type UseTenantDirectoryUrlStateParams = {
  totalPages?: number;
};

type UseTenantDirectoryUrlStateResult = {
  orgSlug: string;
  currentPage: number;
  search: string;
  searchInput: string;
  setSearchInput: (value: string) => void;
  goToPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
};

/**
 * normalizePage
 *
 * Ensures page values are always valid positive integers.
 */
function normalizePage(value: string | null): number {
  const parsedValue = Number(value ?? "1");

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return Math.floor(parsedValue);
}

/**
 * useTenantDirectoryUrlState
 *
 * Centralizes URL-backed state for the tenant directory route.
 *
 * Responsibilities:
 * - Read org, page, and search from the URL.
 * - Maintain a local search input for smooth typing UX.
 * - Debounce search changes before syncing them into the URL.
 * - Expose safe page navigation helpers.
 *
 * Important:
 * - URL state remains the source of truth.
 * - Search input is a temporary UI buffer layered on top of URL state.
 */
export function useTenantDirectoryUrlState({
  totalPages,
}: UseTenantDirectoryUrlStateParams = {}): UseTenantDirectoryUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();

  // Step 1: Read canonical URL state
  const orgSlug = searchParams.get("org") ?? "";
  const currentPage = normalizePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";

  // Step 2: Keep a local buffered input for smoother typing
  const [searchInput, setSearchInput] = useState(search);

  // Step 3: Sync local input if browser nav or external URL changes occur
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Step 4: Debounce search input into URL state
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmedSearchInput = searchInput.trim();
      const trimmedSearch = search.trim();

      if (trimmedSearchInput === trimmedSearch) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);

      if (orgSlug) {
        nextParams.set("org", orgSlug);
      }

      if (trimmedSearchInput) {
        nextParams.set("search", trimmedSearchInput);
      } else {
        nextParams.delete("search");
      }

      // Reset to page 1 whenever the search term changes
      nextParams.set("page", "1");

      setSearchParams(nextParams);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [orgSlug, search, searchInput, searchParams, setSearchParams]);

  /**
   * setPage
   *
   * Safely updates the page number in URL state.
   */
  function setPage(nextPage: number) {
    const normalizedNextPage = Math.max(1, Math.floor(nextPage));
    const clampedNextPage =
      typeof totalPages === "number"
        ? Math.min(normalizedNextPage, Math.max(totalPages, 1))
        : normalizedNextPage;

    const nextParams = new URLSearchParams(searchParams);

    if (orgSlug) {
      nextParams.set("org", orgSlug);
    }

    nextParams.set("page", String(clampedNextPage));

    if (search.trim()) {
      nextParams.set("search", search.trim());
    } else {
      nextParams.delete("search");
    }

    setSearchParams(nextParams);
  }

  /**
   * goToPage
   *
   * Public page navigation helper.
   */
  function goToPage(nextPage: number) {
    setPage(nextPage);
  }

  /**
   * goToPreviousPage
   *
   * Moves to the previous page safely.
   */
  function goToPreviousPage() {
    setPage(currentPage - 1);
  }

  /**
   * goToNextPage
   *
   * Moves to the next page safely.
   */
  function goToNextPage() {
    setPage(currentPage + 1);
  }

  return {
    orgSlug,
    currentPage,
    search,
    searchInput,
    setSearchInput,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  };
}