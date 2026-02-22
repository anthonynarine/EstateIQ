// # Filename: src/features/tenancy/pages/UnitLeasesPage.tsx


import React, { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useOrg } from "../hooks/useOrg";
import { formatApiError } from "../../../api/formatApiError";

import PageStateCard from "../components/PageStateCard";
import LeasesTable from "../components/LeasesTable";
import LeaseCreateModal from "../components/LeaseCreateModal";

import { useTenantsQuery } from "../queries/useTenantsQuery";
import { useUnitLeasesQuery } from "../queries/useUnitLeasesQuery";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";

import { getHttpErrorHint } from "../utils/getHttpErrorHint";
import type { CreateLeasePayload } from "../types";

/**
 * UnitLeasesPage
 *
 * Production shape:
 * - Page is orchestration-only (queries + mutation + modal state)
 * - UI details live in components:
 *   - LeasesTable
 *   - LeaseCreateModal
 *   - PageStateCard
 *
 * Multi-tenant hardening:
 * - orgSlug is part of query keys inside hooks
 * - axios attaches X-Org-Slug automatically (your existing interceptor)
 */
export default function UnitLeasesPage() {
  // Step 1: unitId from route params
  const params = useParams();
  const unitId = useMemo(() => Number(params.unitId), [params.unitId]);
  const unitIdValid = Number.isFinite(unitId) && unitId > 0;

  // Step 2: orgSlug from org context (shape-safe)
  const orgCtx = useOrg() as any;
  const orgSlug: string =
    orgCtx?.orgSlug ?? orgCtx?.activeOrgSlug ?? orgCtx?.activeOrg?.slug ?? "";

  // Step 3: Queries (server state)
  const leasesQuery = useUnitLeasesQuery({ orgSlug, unitId });

  // MVP: tenants dropdown needs a list
  const tenantsQuery = useTenantsQuery({
    orgSlug,
    page: 1,
    pageSize: 50,
    ordering: "full_name",
  });

  // Step 4: Mutation (server write + invalidation)
  const createLease = useCreateLeaseMutation({ orgSlug, unitId });

  // Step 5: Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);

  // Step 6: Create handler (modal builds payload; we execute mutation)
  const handleCreateLease = useCallback(
    async (payload: CreateLeasePayload) => {
      await createLease.mutateAsync(payload);
    },
    [createLease]
  );

  // Step 7: Guard rails
  if (!orgSlug) {
    return (
      <PageStateCard
        title="No organization selected"
        description="Select an organization to view unit leases (orgSlug is required for multi-tenant requests)."
      />
    );
  }

  if (!unitIdValid) {
    return (
      <PageStateCard
        title="Invalid unitId"
        description="Expected route: /dashboard/units/:unitId/leases"
      />
    );
  }

  // Step 8: Error messaging (where/why/fix)
  const errorMessage = leasesQuery.error
    ? formatApiError(leasesQuery.error)
    : null;

  const status = (leasesQuery.error as any)?.response?.status as number | undefined;
  const errorHint = getHttpErrorHint(status);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold text-zinc-100">Unit Leases</div>
          <div className="mt-1 text-sm text-zinc-400">
            Unit <span className="text-zinc-200">#{unitId}</span> • Org{" "}
            <span className="text-zinc-200">{orgSlug}</span>
          </div>

          {leasesQuery.isFetching && !leasesQuery.isLoading ? (
            <div className="mt-2 text-xs text-zinc-500">Updating…</div>
          ) : null}
        </div>

        <button
          className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100"
          onClick={openCreate}
        >
          Create Lease
        </button>
      </div>

      {/* Errors */}
      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/30 p-5">
          <div className="text-sm font-semibold text-red-200">Request failed</div>
          <div className="mt-1 text-sm text-red-200/80">{errorMessage}</div>
          {errorHint ? (
            <div className="mt-2 text-xs text-red-200/70">{errorHint}</div>
          ) : null}
        </div>
      ) : null}

      {/* Table */}
      <div className="mt-6">
        <LeasesTable
          leases={leasesQuery.data ?? []}
          isLoading={leasesQuery.isLoading}
          isFetching={leasesQuery.isFetching}
        />
      </div>

      {/* Create Lease Modal */}
      <LeaseCreateModal
        isOpen={isCreateOpen}
        orgSlug={orgSlug}
        unitId={unitId}
        tenants={tenantsQuery.data?.results ?? []}
        tenantsLoading={tenantsQuery.isLoading}
        isSaving={createLease.isPending}
        errorMessage={createLease.errorMessage}
        onClose={closeCreate}
        onCreate={handleCreateLease}
      />
    </div>
  );
}
