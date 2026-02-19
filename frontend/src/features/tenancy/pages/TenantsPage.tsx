// # Filename: src/features/tenancy/pages/TenantsPage.tsx

import { useCallback, useMemo, useState } from "react";

import { useTenantsQuery } from "../queries/useTenantsQuery";
import { useCreateTenantMutation } from "../queries/useCreateTenantMutation";

import TenantsTable from "../components/TenantsTable";
import TenantCreateModal from "../components/TenantCreateModal"; 

import { formatApiError } from "../../../api/formatApiError";
import { useOrg } from "../../../org/useOrg";

export default function TenantsPage() {
  // Step 1: Resolve orgSlug from OrgProvider
  const orgCtx = useOrg() as any;
  const orgSlug: string =
    orgCtx?.orgSlug ?? orgCtx?.activeOrgSlug ?? orgCtx?.activeOrg?.slug ?? "";

  // Step 2: UI state for list controls
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [ordering, setOrdering] = useState<string>("full_name");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string>("");

  // Step 3: TanStack Query (list)
  const tenantsQuery = useTenantsQuery({
    orgSlug,
    page,
    pageSize,
    ordering,
    search: search || undefined,
  });

  const tenants = tenantsQuery.data?.results ?? [];
  const count = tenantsQuery.data?.count ?? 0;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(count / pageSize));
  }, [count, pageSize]);

  // Step 4: Create mutation
  const createTenant = useCreateTenantMutation(orgSlug);

  // Step 5: Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
  }, []);

  const handleApplySearch = useCallback(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);

  const onPrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const onNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleCreateFromModal = useCallback(
    async (payload: { full_name: string; email: string | null; phone: string | null }) => {
      // Step 6: mutateAsync throws on failure (modal stays open)
      await createTenant.mutateAsync(payload);

      // Step 7: reset to page 1 after create (common UX)
      setPage(1);
    },
    [createTenant]
  );

  const listErrorMessage = tenantsQuery.error ? formatApiError(tenantsQuery.error) : null;

  const listErrorHint = useMemo(() => {
    const anyErr = tenantsQuery.error as any;
    const status = anyErr?.response?.status;

    if (status === 401) {
      return "401 Unauthorized: access token may be expired. If refresh failed, you were likely logged out.";
    }
    if (status === 403) {
      return "403 Forbidden: you may not have access to this org, or X-Org-Slug is missing/incorrect.";
    }
    if (status === 400) {
      return "400 Bad Request: check query params (ordering/search/page).";
    }
    return null;
  }, [tenantsQuery.error]);

  if (!orgSlug) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-lg font-semibold text-zinc-100">No organization selected</div>
          <div className="mt-2 text-sm text-zinc-400">
            Select an organization to view tenants (orgSlug is required for multi-tenant requests).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold text-zinc-100">Tenants</div>
          <div className="mt-1 text-sm text-zinc-400">
            Create and manage tenants for attaching to leases.
          </div>

          {tenantsQuery.isFetching && !tenantsQuery.isLoading ? (
            <div className="mt-2 text-xs text-zinc-500">Updating…</div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none"
            value={ordering}
            onChange={(e) => {
              setPage(1);
              setOrdering(e.target.value);
            }}
          >
            <option value="full_name">Order: Name (A→Z)</option>
            <option value="-created_at">Order: Newest</option>
            <option value="created_at">Order: Oldest</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              className="w-44 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
            />
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100"
              onClick={handleApplySearch}
            >
              Apply
            </button>
          </div>

          <button
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100"
            onClick={() => setIsCreateOpen(true)}
          >
            Create Tenant
          </button>
        </div>
      </div>

      {/* Errors */}
      {listErrorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/30 p-5">
          <div className="text-sm font-semibold text-red-200">Request failed</div>
          <div className="mt-1 text-sm text-red-200/80">{listErrorMessage}</div>
          {listErrorHint ? <div className="mt-2 text-xs text-red-200/70">{listErrorHint}</div> : null}
        </div>
      ) : null}

      <div className="mt-6">
        <TenantsTable
          tenants={tenants}
          isLoading={tenantsQuery.isLoading}
          isFetching={tenantsQuery.isFetching}
          count={count}
          page={page}
          pageSize={pageSize}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
        />
      </div>

      <TenantCreateModal
        isOpen={isCreateOpen}
        orgSlug={orgSlug}
        isSaving={createTenant.isPending}
        errorMessage={createTenant.errorMessage}
        onClose={closeCreate}
        onCreate={handleCreateFromModal}
      />
    </div>
  );
}
