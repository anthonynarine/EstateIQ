// # Filename: src/features/tenants/components/TenantDirectorySection.tsx
// ✅ New Code

import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  tenantsCount: number;
  isAddOpen: boolean;
  onToggleAdd: () => void;
  addForm: ReactNode;
  isLoading: boolean;
  isError: boolean;
  emptyMessage?: string;
  renderTenants: () => ReactNode;
};

/**
 * TenantDirectorySection
 *
 * Premium workspace shell for the tenant directory.
 *
 * Responsibilities:
 * - Render the section header and action area
 * - Toggle inline tenant creation form
 * - Render loading / error / empty states
 * - Render tenant cards/list through `renderTenants`
 *
 * Non-responsibilities:
 * - No data fetching
 * - No mutation logic
 * - No tenant card rendering details
 */
export default function TenantDirectorySection({
  title = "Tenants",
  subtitle = "Manage tenant records for this organization. Tenants are first-class records and power lease selection, communication, and future billing workflows.",
  tenantsCount,
  isAddOpen,
  onToggleAdd,
  addForm,
  isLoading,
  isError,
  emptyMessage = "No tenants yet. Add the first tenant to start building a reusable tenant directory for leases.",
  renderTenants,
}: Props) {
  // Step 1: Loading state
  if (isLoading) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
            Loading tenants…
          </div>
        </div>
      </section>
    );
  }

  // Step 2: Error state
  if (isError) {
    return (
      <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-300">
            Failed to load tenants. Please refresh and try again.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Tenant workspace
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>

            <p className="max-w-2xl text-sm text-neutral-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {tenantsCount} {tenantsCount === 1 ? "tenant" : "tenants"}
            </span>

            <button
              type="button"
              onClick={onToggleAdd}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2",
                "text-xs font-semibold transition",
                isAddOpen
                  ? "border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              <span className="text-sm leading-none">{isAddOpen ? "×" : "+"}</span>
              {isAddOpen ? "Close form" : "Add tenant"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {isAddOpen ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4 sm:p-5">
            {addForm}
          </div>
        ) : null}

        {tenantsCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-8 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <div className="text-sm font-medium text-white">No tenants yet</div>
              <p className="text-sm text-neutral-400">{emptyMessage}</p>

              {!isAddOpen ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onToggleAdd}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Create first tenant
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {renderTenants()}
          </div>
        )}
      </div>
    </section>
  );
}