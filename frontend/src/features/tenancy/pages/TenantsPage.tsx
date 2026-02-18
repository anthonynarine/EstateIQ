// # Filename: src/features/tenancy/pages/TenantsPage.tsx


import React, { useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import TenantsTable from "../components/TenantsTable";
import TenantCreateModal from "../components/TenantCreateModal";
import { useTenantsQuery } from "../queries/useTenantsQuery";

// NOTE: adjust this import to your actual org hook path
import { useOrg } from "../../../org/useOrg";

export default function TenantsPage() {
  const { activeOrg } = useOrg();
  const orgSlug = activeOrg?.slug ?? null;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [ordering, setOrdering] = useState<string>("full_name");
  const [createOpen, setCreateOpen] = useState(false);

  const query = useTenantsQuery({ orgSlug, page, pageSize, ordering });

  const tenants = useMemo(() => query.data?.results ?? [], [query.data]);
  const count = query.data?.count ?? 0;

  const errorMessage = useMemo(() => {
    if (!query.error) return null;

    const err: any = query.error;
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail ?? err?.message ?? "Unknown error.";

    // Step 1: Clear, actionable error text
    return `List tenants failed${status ? ` (HTTP ${status})` : ""}: ${
      typeof detail === "string" ? detail : JSON.stringify(detail)
    }`;
  }, [query.error]);

  return (
    <div className="min-h-screen">
      <TenantCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          // Temporary: we'll replace this with invalidateQueries when we add mutations next
          setPage(1);
          query.refetch();
        }}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Tenants</div>
            <div className="mt-1 text-sm text-zinc-400">
              Create and manage tenants for attaching to leases.
            </div>
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

            <Button onClick={() => setCreateOpen(true)}>Create Tenant</Button>
          </div>
        </div>

        <div className="mt-8">
          <TenantsTable
            tenants={tenants}
            isLoading={query.isLoading}
            error={errorMessage}
            page={page}
            pageSize={pageSize}
            count={count}
            onPageChange={(p) => setPage(p)}
          />

          {/* Step 2: "Refreshing" indicator (background fetch) */}
          {query.isFetching && !query.isLoading ? (
            <div className="mt-3 text-xs text-zinc-500">Refreshing…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
