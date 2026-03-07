// # Filename: src/features/tenants/pages/TenantsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users } from "lucide-react";

import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "../api/types";
import TenantCard from "../components/cards/TenantCard";
import TenantDirectorySection from "../components/directory/TenantDirectorySection";
import CreateTenantForm, { type TenantFormValue } from "../forms/CreateTenantForm";
import EditTenantModal from "../forms/EditTenantModal";
import { useCreateTenantMutation } from "../hooks/useCreateTenantMutation";
import { useTenantDirectoryUrlState } from "../hooks/useTenantDirectoryUrlState";
import { useTenantsQuery } from "../hooks/useTenantsQuery";
import { useUpdateTenantMutation } from "../hooks/useUpdateTenantMutation";

/**
 * normalizeOptionalText
 *
 * Converts a text input into:
 * - trimmed string
 * - null when empty
 */
function normalizeOptionalText(value: string): string | null {
  // Step 1: Trim whitespace
  const trimmed = value.trim();

  // Step 2: Empty becomes null
  return trimmed ? trimmed : null;
}

/**
 * getMutationErrorMessage
 *
 * Converts common mutation error shapes into a readable UI-safe string.
 *
 * Important:
 * - Return null when there is no error so we do not pre-populate error banners.
 */
function getMutationErrorMessage(
  error: unknown,
  fallback: string
): string | null {
  // Step 1: No error yet
  if (!error) {
    return null;
  }

  // Step 2: Prefer native Error messages
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  // Step 3: Fall back to a stable user-facing message
  return fallback;
}

/**
 * TenantsPage
 *
 * Route-level orchestrator for the tenant directory workspace.
 *
 * Responsibilities:
 * - Read org/page/search from URL-backed hook state.
 * - Fetch paginated tenant directory data.
 * - Own create/edit UI state.
 * - Launch tenant-driven lease creation.
 * - Keep the page thin by delegating layout to child components.
 */
export default function TenantsPage() {
  const navigate = useNavigate();

  // Step 1: Route-backed directory state
  const {
    orgSlug,
    currentPage,
    search,
    searchInput,
    setSearchInput,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = useTenantDirectoryUrlState();

  // Step 2: Workspace-local UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editValue, setEditValue] = useState<TenantFormValue>({
    full_name: "",
    email: "",
    phone: "",
  });

  // Step 3: Fetch tenant directory data
  const {
    data: tenantPage,
    isLoading,
    isError,
    error,
  } = useTenantsQuery({
    orgSlug,
    page: currentPage,
    pageSize: 12,
    search,
  });

  // Step 4: Org-scoped mutations
  const createTenantMutation = useCreateTenantMutation(orgSlug);
  const updateTenantMutation = useUpdateTenantMutation(orgSlug);

  // Step 5: Derive page data safely
  const tenants = tenantPage?.results ?? [];
  const totalCount = tenantPage?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 12));

  // Step 6: Clamp stale/out-of-range page values
  useEffect(() => {
    if (!tenantPage) {
      return;
    }

    if (currentPage > totalPages) {
      goToPage(totalPages);
    }
  }, [tenantPage, currentPage, totalPages, goToPage]);

  // Step 7: Keep a stable display order
  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tenants]);

  // Step 8: Sync edit form state when a tenant is selected for editing
  useEffect(() => {
    if (!editingTenant) {
      return;
    }

    setEditValue({
      full_name: editingTenant.full_name ?? "",
      email: editingTenant.email ?? "",
      phone: editingTenant.phone ?? "",
    });
  }, [editingTenant]);

  // Step 9: View workflow
  function handleViewTenant(tenant: Tenant) {
    navigate(`/dashboard/tenants/${tenant.id}?org=${orgSlug}`);
  }

  // Step 10: Edit workflow
  function handleEditTenant(tenant: Tenant) {
    updateTenantMutation.reset();
    setEditingTenant(tenant);
  }

  function handleCloseEditModal() {
    if (updateTenantMutation.isPending) {
      return;
    }

    updateTenantMutation.reset();
    setEditingTenant(null);
  }

  async function handleUpdateTenant() {
    if (!editingTenant) {
      return;
    }

    const payload: UpdateTenantInput = {
      full_name: editValue.full_name.trim(),
      email: normalizeOptionalText(editValue.email),
      phone: normalizeOptionalText(editValue.phone),
    };

    await updateTenantMutation.mutateAsync({
      tenantId: editingTenant.id,
      payload,
    });

    setEditingTenant(null);
  }

  // Step 11: Create workflow
  function handleOpenCreate() {
    createTenantMutation.reset();
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    if (createTenantMutation.isPending) {
      return;
    }

    createTenantMutation.reset();
    setIsCreateOpen(false);
  }

  async function handleCreateTenant(payload: CreateTenantInput) {
    await createTenantMutation.mutateAsync(payload);
    setIsCreateOpen(false);
  }

  // Step 12: Lease launch workflow
  function handleCreateLease(tenant: Tenant) {
    navigate(`/dashboard/leases/new?org=${orgSlug}&tenantId=${tenant.id}`);
  }

  // Step 13: Guard missing org context
  if (!orgSlug) {
    return (
      <section className="space-y-5 sm:space-y-6">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                Tenant workspace
              </p>

              <h1 className="text-lg font-semibold text-white sm:text-xl">
                Tenant Directory
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-neutral-300">
                No organization is currently selected. Open this page from an
                org-scoped dashboard route so the tenant directory can load
                safely.
              </p>

              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Step 14: Hero */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
              <Users className="h-5 w-5" />
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Leasing
              </p>

              <h1 className="text-lg font-semibold text-white sm:text-xl">
                Tenant Directory
              </h1>

              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Manage reusable tenant records for this organization. This is
                the launch point for lease assignment, tenant lookup, and
                contact workflows.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              Org: {orgSlug}
            </span>

            <Link
              to={`/dashboard?org=${orgSlug}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Step 15: Hidden-by-default create panel */}
      {isCreateOpen && (
        <CreateTenantForm
          isSaving={createTenantMutation.isPending}
          errorMessage={getMutationErrorMessage(
            createTenantMutation.error,
            "Unable to create tenant."
          )}
          onSubmit={handleCreateTenant}
          onCancel={handleCloseCreate}
        />
      )}

      {/* Step 16: Directory section */}
      <TenantDirectorySection
        tenantsCount={totalCount}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onAddTenant={handleOpenCreate}
        isLoading={isLoading}
        isError={isError}
        errorMessage={
          error instanceof Error
            ? error.message
            : "Unable to load tenants."
        }
        currentPage={currentPage}
        totalPages={totalPages}
        hasPreviousPage={currentPage > 1}
        hasNextPage={currentPage < totalPages}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        isEmpty={sortedTenants.length === 0}
        emptyStateTitle={
          search.trim() ? "No tenants matched your search." : "No tenants yet."
        }
        emptyStateDescription={
          search.trim()
            ? "Try a different name, email, or phone number."
            : "Create your first tenant to begin building your directory."
        }
      >
        {sortedTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onView={() => handleViewTenant(tenant)}
            onEdit={() => handleEditTenant(tenant)}
            onCreateLease={() => handleCreateLease(tenant)}
          />
        ))}
      </TenantDirectorySection>

      {/* Step 17: Edit modal */}
      <EditTenantModal
        isOpen={Boolean(editingTenant)}
        tenantDisplayName={editingTenant?.full_name ?? "Tenant"}
        value={editValue}
        isSaving={updateTenantMutation.isPending}
        errorMessage={getMutationErrorMessage(
          updateTenantMutation.error,
          "Unable to update tenant."
        )}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateTenant}
        onChange={(next) => {
          setEditValue((prev) => ({
            ...prev,
            ...next,
          }));
        }}
      />
    </section>
  );
}