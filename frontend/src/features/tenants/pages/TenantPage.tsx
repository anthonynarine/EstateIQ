// # Filename: src/features/tenants/pages/TenantsPage.tsx
// ✅ New Code

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import TenantDirectorySection from "../components/TenantDirectorySection";
import TenantCard from "../components/TenantCard";
import { useTenantsQuery } from "../hooks/useTenantsQuery";
import {
  getCreateTenantErrorMessage,
  useCreateTenantMutation,
} from "../hooks/useCreateTenantMutation";
import {
  getUpdateTenantErrorMessage,
  useUpdateTenantMutation,
} from "../hooks/useUpdateTenantMutation";
import CreateTenantForm, { type TenantFormValue } from "../forms/CreateTenantForm";
import EditTenantModal from "../forms/EditTemplateModal";
import type { CreateTenantInput, Tenant, UpdateTenantInput } from "../api/types";

/**
 * normalizeOptionalText
 *
 * Converts form text into a trimmed value or null when empty.
 */
function normalizeOptionalText(value: string): string | null {
  // Step 1: Trim whitespace
  const trimmed = value.trim();

  // Step 2: Empty becomes null
  return trimmed ? trimmed : null;
}

/**
 * TenantsPage
 *
 * Route-level orchestrator for the tenant directory.
 *
 * Responsibilities:
 * - Read org slug from the URL
 * - Load org-scoped tenant data
 * - Control local UI state for create/edit/view
 * - Render tenant cards
 * - Launch tenant-driven lease creation
 */
export default function TenantsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Step 1: Resolve org context from query params
  const orgSlug = searchParams.get("org") ?? "";

  // Step 2: Local UI state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Step 3: Controlled edit form state
  const [editValue, setEditValue] = useState<TenantFormValue>({
    full_name: "",
    email: "",
    phone: "",
  });

  // Step 4: Load tenant directory
  const {
    data: tenants = [],
    isLoading,
    isError,
  } = useTenantsQuery(orgSlug);

  // Step 5: Mutations
  const createTenantMutation = useCreateTenantMutation({ orgSlug });
  const updateTenantMutation = useUpdateTenantMutation({ orgSlug });

  // Step 6: Stable sorting for predictable UX
  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [tenants]);

  // Step 7: Sync edit form when opening edit mode
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

  const handleCreateTenant = async (payload: CreateTenantInput) => {
    await createTenantMutation.mutateAsync(payload);
    setIsAddOpen(false);
  };

  const handleStartEdit = (tenant: Tenant) => {
    updateTenantMutation.reset();
    setEditingTenant(tenant);
  };

  const handleUpdateTenant = async () => {
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
  };

  /**
   * handleCreateLease
   *
   * Launches the tenant-driven lease creation flow.
   *
   * Current contract:
   * - tenant page provides tenantId
   * - lease creation flow will later ask user to select building/unit
   *
   * This supports the mental model:
   * Tenant -> Create Lease -> Assign to Unit
   */
  const handleCreateLease = (tenant: Tenant) => {
    navigate(`/dashboard/leases/new?org=${orgSlug}&tenantId=${tenant.id}`);
  };

  // Step 8: Guard missing org
  if (!orgSlug) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">
              Tenant workspace
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Tenants
            </h1>

            <p className="max-w-2xl text-sm text-neutral-300">
              No organization is currently selected. Open this page from an
              org-scoped dashboard route so the tenant directory can load safely.
            </p>
          </div>

          <div className="mt-5">
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Step 9: Workspace intro */}
      <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Leasing
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Tenant Directory
            </h1>

            <p className="max-w-3xl text-sm text-neutral-400">
              Manage reusable tenant records for this organization. This page is
              the foundation for lease assignment, tenant lookup, communication,
              receipts, and future rent workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
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

      {/* Step 10: Main tenant directory */}
      <TenantDirectorySection
        tenantsCount={sortedTenants.length}
        isAddOpen={isAddOpen}
        onToggleAdd={() => {
          createTenantMutation.reset();
          setIsAddOpen((prev) => !prev);
        }}
        isLoading={isLoading}
        isError={isError}
        addForm={
          <CreateTenantForm
            isSaving={createTenantMutation.isPending}
            errorMessage={
              createTenantMutation.error
                ? getCreateTenantErrorMessage(createTenantMutation.error)
                : null
            }
            onSubmit={handleCreateTenant}
            onCancel={() => {
              createTenantMutation.reset();
              setIsAddOpen(false);
            }}
          />
        }
        renderTenants={() =>
          sortedTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onView={(currentTenant) => {
                setSelectedTenant(currentTenant);
              }}
              onEdit={handleStartEdit}
              onCreateLease={handleCreateLease}
            />
          ))
        }
      />

      {/* Step 11: Temporary detail panel until TenantDetailPage exists */}
      {selectedTenant ? (
        <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Selected tenant
              </p>

              <h2 className="text-xl font-semibold tracking-tight text-white">
                {selectedTenant.full_name}
              </h2>

              <div className="space-y-1 text-sm text-neutral-400">
                <p>Email: {selectedTenant.email || "Not provided"}</p>
                <p>Phone: {selectedTenant.phone || "Not provided"}</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateLease(selectedTenant)}
                  className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Create lease for this tenant
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTenant(null);
              }}
              className="inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 12: Edit modal */}
      <EditTenantModal
        isOpen={Boolean(editingTenant)}
        tenantDisplayName={editingTenant?.full_name ?? "Tenant"}
        value={editValue}
        isSaving={updateTenantMutation.isPending}
        errorMessage={
          updateTenantMutation.error
            ? getUpdateTenantErrorMessage(updateTenantMutation.error)
            : null
        }
        onClose={() => {
          if (updateTenantMutation.isPending) {
            return;
          }

          updateTenantMutation.reset();
          setEditingTenant(null);
        }}
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