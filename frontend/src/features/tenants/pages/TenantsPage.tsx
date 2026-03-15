// # Filename: src/features/tenants/pages/TenantsPage.tsx
// ✅ New Code

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users, Plus } from "lucide-react";

import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "../api/types";
import { TENANT_DIRECTORY_PAGE_SIZE } from "../constants/tenantConstants";
import TenantCard from "../components/cards/TenantCard";
import TenantDirectorySection from "../components/directory/TenantDirectorySection";
import CreateTenantForm, {
  type TenantFormValue,
} from "../forms/CreateTenantForm";
import EditTenantModal from "../forms/EditTenantModal";
import { useCreateTenantMutation } from "../hooks/useCreateTenantMutation";
import { useTenantDirectoryUrlState } from "../hooks/useTenantDirectoryUrlState";
import { useTenantsQuery } from "../hooks/useTenantsQuery";
import { useUpdateTenantMutation } from "../hooks/useUpdateTenantMutation";
import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";
/**
 * normalizeOptionalText
 *
 * Converts an input string into a trimmed nullable value.
 *
 * Args:
 *   value: Raw form text value.
 *
 * Returns:
 *   Trimmed string or null when empty.
 */
function normalizeOptionalText(value: string): string | null {
  // Step 1: Trim whitespace
  const trimmed = value.trim();

  // Step 2: Return null when empty
  return trimmed ? trimmed : null;
}

/**
 * getMutationErrorMessage
 *
 * Normalizes mutation errors into a user-safe message.
 *
 * Args:
 *   error: Unknown error object from the mutation.
 *   fallback: Stable fallback message.
 *
 * Returns:
 *   A display-ready message or null.
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

  // Step 3: Fallback to a stable message
  return fallback;
}

/**
 * TenantsPage
 *
 * Route-level orchestrator for the tenant directory.
 *
 * Responsibilities:
 * - Own org/page/search URL state
 * - Fetch the paginated tenant directory
 * - Manage create/edit tenant workflows
 * - Launch lease workflows from tenant cards
 * - Inject standardized collection pagination footer
 */
export default function TenantsPage() {
  const navigate = useNavigate();

  // Step 1: URL-backed directory state
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

  // Step 2: Local UI state
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
    isFetching,
  } = useTenantsQuery({
    orgSlug,
    page: currentPage,
    pageSize: TENANT_DIRECTORY_PAGE_SIZE,
    search,
  });

  // Step 4: Org-scoped mutations
  const createTenantMutation = useCreateTenantMutation(orgSlug);
  const updateTenantMutation = useUpdateTenantMutation(orgSlug);

  // Step 5: Derive page data safely
  const tenants = tenantPage?.results ?? [];
  const totalCount = tenantPage?.count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / TENANT_DIRECTORY_PAGE_SIZE)
  );

  // Step 6: Clamp stale page values after filtering or mutation refresh
  useEffect(() => {
    if (!tenantPage) {
      return;
    }

    if (currentPage > totalPages) {
      goToPage(totalPages);
    }
  }, [tenantPage, currentPage, totalPages, goToPage]);

  // Step 7: Keep a stable alphabetical display order
  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tenants]);

  // Step 8: Sync edit form state when a tenant is chosen
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

  /**
   * handleOpenLease
   *
   * Navigates to the active lease for the selected tenant.
   */
  function handleOpenLease(tenant: Tenant) {
    // Step 1: Guard missing active lease
    if (!tenant.active_lease?.id) {
      return;
    }

    // Step 2: Navigate to lease detail
    navigate(`/dashboard/leases/${tenant.active_lease.id}?org=${orgSlug}`);
  }

  /**
   * handleCreateLease
   *
   * Launches lease creation pre-seeded with the tenant id.
   */
  function handleCreateLease(tenant: Tenant) {
    // Step 1: Navigate to new lease workflow
    navigate(`/dashboard/leases/new?org=${orgSlug}&tenantId=${tenant.id}`);
  }

  /**
   * handleEditTenant
   *
   * Opens the edit modal for the selected tenant.
   */
  function handleEditTenant(tenant: Tenant) {
    // Step 1: Reset stale mutation state
    updateTenantMutation.reset();

    // Step 2: Open modal with selected tenant
    setEditingTenant(tenant);
  }

  /**
   * handleCloseEditModal
   *
   * Closes the edit modal when safe.
   */
  function handleCloseEditModal() {
    // Step 1: Prevent closing while save is pending
    if (updateTenantMutation.isPending) {
      return;
    }

    // Step 2: Reset modal state
    updateTenantMutation.reset();
    setEditingTenant(null);
  }

  /**
   * handleUpdateTenant
   *
   * Saves the current edit form.
   */
  async function handleUpdateTenant() {
    // Step 1: Guard missing tenant
    if (!editingTenant) {
      return;
    }

    const payload: UpdateTenantInput = {
      full_name: editValue.full_name.trim(),
      email: normalizeOptionalText(editValue.email),
      phone: normalizeOptionalText(editValue.phone),
    };

    // Step 2: Submit update
    await updateTenantMutation.mutateAsync({
      tenantId: editingTenant.id,
      payload,
    });

    // Step 3: Close modal after success
    setEditingTenant(null);
  }

  /**
   * handleOpenCreate
   *
   * Opens the create tenant panel.
   */
  function handleOpenCreate() {
    // Step 1: Reset stale mutation state
    createTenantMutation.reset();

    // Step 2: Open create panel
    setIsCreateOpen(true);
  }

  /**
   * handleCloseCreate
   *
   * Closes the create tenant panel when safe.
   */
  function handleCloseCreate() {
    // Step 1: Prevent closing while save is pending
    if (createTenantMutation.isPending) {
      return;
    }

    // Step 2: Reset panel state
    createTenantMutation.reset();
    setIsCreateOpen(false);
  }

  /**
   * handleCreateTenant
   *
   * Creates a new tenant record.
   */
  async function handleCreateTenant(payload: CreateTenantInput) {
    // Step 1: Submit create mutation
    await createTenantMutation.mutateAsync(payload);

    // Step 2: Close panel after success
    setIsCreateOpen(false);
  }

  // Step 9: Guard missing org context
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
      {/* Step 10: Hero */}
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

      {/* Step 11: Create tenant panel */}
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

      {/* Step 12: Directory section */}
      <TenantDirectorySection
        tenantsCount={totalCount}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onAddTenant={handleOpenCreate}
        addButtonLabel="Add Tenant"
        addButtonIcon={<Plus className="h-4 w-4" />}
        isLoading={isLoading}
        isError={isError}
        errorMessage={
          error instanceof Error ? error.message : "Unable to load tenants."
        }
        isEmpty={sortedTenants.length === 0}
        emptyStateTitle={
          search.trim() ? "No tenants matched your search." : "No tenants yet."
        }
        emptyStateDescription={
          search.trim()
            ? "Try a different name, email, or phone number."
            : "Create your first tenant to begin building your directory."
        }
        footer={
          totalCount > TENANT_DIRECTORY_PAGE_SIZE ? (
            <CollectionPaginationFooter
              page={currentPage}
              pageSize={TENANT_DIRECTORY_PAGE_SIZE}
              totalCount={totalCount}
              itemLabel="tenant"
              isFetching={isFetching}
              onPrevious={goToPreviousPage}
              onNext={goToNextPage}
            />
          ) : null
        }
      >
        {sortedTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onEdit={() => handleEditTenant(tenant)}
            onCreateLease={() => handleCreateLease(tenant)}
            onOpenLease={
              tenant.active_lease?.id
                ? () => handleOpenLease(tenant)
                : undefined
            }
          />
        ))}
      </TenantDirectorySection>

      {/* Step 13: Edit tenant modal */}
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