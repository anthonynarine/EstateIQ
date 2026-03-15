// # Filename: src/features/tenants/pages/TenantsPage.tsx
// ✅ New Code

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "../api/types";
import { TENANT_DIRECTORY_PAGE_SIZE } from "../constants/tenantConstants";
import TenantCard from "../components/cards/TenantCard";
import TenantDirectorySection from "../components/directory/TenantDirectorySection";
import TenantDirectoryHero from "../components/layout/TenantDirectoryHero";
import CreateTenantForm, {
  type TenantFormValue,
} from "../forms/CreateTenantForm";
import EditTenantModal from "../forms/EditTenantModal";
import { useCreateTenantMutation } from "../hooks/useCreateTenantMutation";
import { useTenantsQuery } from "../hooks/useTenantsQuery";
import { useUpdateTenantMutation } from "../hooks/useUpdateTenantMutation";
import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";

/**
 * parsePositiveInt
 *
 * Safely parses a positive integer from URL params.
 */
function parsePositiveInt(value: string | null, fallback: number): number {
  // Step 1: Guard empty values
  if (!value) {
    return fallback;
  }

  // Step 2: Parse value
  const parsed = Number(value);

  // Step 3: Guard invalid numbers
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  // Step 4: Return safe page number
  return parsed;
}

/**
 * normalizeOptionalText
 *
 * Converts an input string into a trimmed nullable value.
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
 * - org resolution
 * - route-backed page/search state
 * - query + mutation orchestration
 * - modal open/close state
 * - lease navigation callbacks
 */
export default function TenantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Step 1: Read route-backed org/search/page state
  const orgSlug = searchParams.get("org") ?? "";
  const search = searchParams.get("search") ?? "";
  const currentPage = useMemo(() => {
    return parsePositiveInt(searchParams.get("page"), 1);
  }, [searchParams]);

  // Step 2: Buffered search input for UX
  const [searchInput, setSearchInput] = useState(search);

  // Step 3: Local modal/edit state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editValue, setEditValue] = useState<TenantFormValue>({
    full_name: "",
    email: "",
    phone: "",
  });

  // Step 4: Keep search input aligned with URL state
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Step 5: Query tenants from route-backed page state
  const tenantsQuery = useTenantsQuery({
    orgSlug,
    page: currentPage,
    pageSize: TENANT_DIRECTORY_PAGE_SIZE,
    search,
  });

  // Step 6: Prepare mutations
  const createTenantMutation = useCreateTenantMutation(orgSlug);
  const updateTenantMutation = useUpdateTenantMutation(orgSlug);

  // Step 7: Normalize paginated response
  const tenantPage = tenantsQuery.data;
  const tenants = tenantPage?.results ?? [];
  const totalCount = tenantPage?.count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / TENANT_DIRECTORY_PAGE_SIZE)
  );

  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tenants]);

  /**
   * setPage
   *
   * Updates the page query param while preserving org and search.
   */
  function setPage(nextPage: number) {
    // Step 1: Clamp page to a valid positive integer
    const safePage = Math.max(1, nextPage);
    const nextParams = new URLSearchParams(searchParams);

    // Step 2: Persist page only when greater than 1
    if (safePage === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(safePage));
    }

    // Step 3: Preserve org scope
    if (orgSlug) {
      nextParams.set("org", orgSlug);
    }

    // Step 4: Preserve trimmed search when present
    if (search.trim()) {
      nextParams.set("search", search.trim());
    } else {
      nextParams.delete("search");
    }

    setSearchParams(nextParams);
  }

  // Step 8: Clamp invalid page numbers after backend count changes
  useEffect(() => {
    if (!tenantsQuery.isSuccess) {
      return;
    }

    if (currentPage > totalPages) {
      setPage(totalPages);
    }
  }, [tenantsQuery.isSuccess, currentPage, totalPages]);

  // Step 9: Debounce search input into URL state and reset to page 1
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmedInput = searchInput.trim();
      const trimmedSearch = search.trim();

      if (trimmedInput === trimmedSearch) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);

      if (orgSlug) {
        nextParams.set("org", orgSlug);
      }

      if (trimmedInput) {
        nextParams.set("search", trimmedInput);
      } else {
        nextParams.delete("search");
      }

      nextParams.delete("page");
      setSearchParams(nextParams);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [orgSlug, search, searchInput, searchParams, setSearchParams]);

  // Step 10: Sync edit form state
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

  function handleOpenLease(tenant: Tenant) {
    if (!tenant.active_lease?.id) {
      return;
    }

    navigate(`/dashboard/leases/${tenant.active_lease.id}?org=${orgSlug}`);
  }

  function handleCreateLease(tenant: Tenant) {
    navigate(`/dashboard/leases/new?org=${orgSlug}&tenantId=${tenant.id}`);
  }

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
    setPage(1);
  }

  if (!orgSlug) {
    return (
      <section className="space-y-5 sm:space-y-6">
        <TenantDirectoryHero isMissingOrg />

        <TenantDirectorySection
          tenantsCount={0}
          searchValue=""
          onSearchChange={() => undefined}
          onAddTenant={() => undefined}
          isLoading={false}
          isError={false}
          isEmpty
          emptyStateTitle="Tenant directory unavailable"
          emptyStateDescription="Select an organization from the dashboard to load tenant records."
        >
          {null}
        </TenantDirectorySection>
      </section>
    );
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <TenantDirectoryHero orgSlug={orgSlug} />

      {isCreateOpen ? (
        <CreateTenantForm
          isSaving={createTenantMutation.isPending}
          errorMessage={getMutationErrorMessage(
            createTenantMutation.error,
            "Unable to create tenant."
          )}
          onSubmit={handleCreateTenant}
          onCancel={handleCloseCreate}
        />
      ) : null}

      <TenantDirectorySection
        tenantsCount={totalCount}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onAddTenant={handleOpenCreate}
        isLoading={tenantsQuery.isLoading}
        isError={tenantsQuery.isError}
        errorMessage={
          tenantsQuery.error instanceof Error
            ? tenantsQuery.error.message
            : "Unable to load tenants."
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
              isFetching={tenantsQuery.isFetching}
              onPrevious={() => setPage(currentPage - 1)}
              onNext={() => setPage(currentPage + 1)}
              className="-mx-5 sm:-mx-6 pt-[1.3rem] pb-0"
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