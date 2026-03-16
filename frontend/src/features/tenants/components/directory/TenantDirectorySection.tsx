// # Filename: src/features/tenants/components/directory/TenantDirectorySection.tsx
// ✅ New Code

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import TenantDirectoryEmptyState from "./TenantDirectoryEmptyState";
import TenantDirectoryGrid from "./TenantDirectoryGrid";
import TenantDirectoryToolbar from "./TenantDirectoryToolbar";

type Props = {
  tenantsCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddTenant: () => void;

  addButtonLabel?: string;
  addButtonIcon?: ReactNode;

  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;

  isEmpty: boolean;
  emptyStateTitle: string;
  emptyStateDescription: string;

  footer?: ReactNode;
  children: ReactNode;
};

/**
 * TenantDirectorySection
 *
 * Presentational workspace shell for the tenant directory.
 *
 * Responsibilities:
 * - Render header identity and primary action
 * - Render centered search workspace
 * - Render loading/error/empty/content/footer states
 *
 * Important:
 * - No fetching
 * - No routing logic
 * - No modal ownership
 */
export default function TenantDirectorySection({
  tenantsCount,
  searchValue,
  onSearchChange,
  onAddTenant,
  addButtonLabel = "Add Tenant",
  addButtonIcon,
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyStateTitle,
  emptyStateDescription,
  footer,
  children,
}: Props) {
  const hasActiveSearch = searchValue.trim().length > 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
      <div className="space-y-4">
        {/* Step 1: Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Tenants
              </h2>

              <span
                className="
                  inline-flex items-center rounded-full border border-white/10
                  bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300
                "
              >
                {tenantsCount}
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Search tenants, review occupancy context, and launch lease actions.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onAddTenant}
              className="
                inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
                border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-sm
                font-medium text-cyan-200 transition
                hover:border-cyan-300/30 hover:bg-cyan-500/15
                focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              "
            >
              {addButtonIcon ?? <Plus className="h-4 w-4" />}
              <span>{addButtonLabel}</span>
            </button>
          </div>
        </div>

        {/* Step 2: Centered search */}
        <TenantDirectoryToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onClearSearch={hasActiveSearch ? () => onSearchChange("") : undefined}
        />

        {/* Step 3: Loading state */}
        {isLoading && (
          <TenantDirectoryGrid>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="
                  min-h-[220px] animate-pulse rounded-3xl border border-white/10
                  bg-white/[0.03]
                "
              />
            ))}
          </TenantDirectoryGrid>
        )}

        {/* Step 4: Error state */}
        {!isLoading && isError && (
          <div
            className="
              rounded-3xl border border-red-500/20 bg-red-500/10 p-5
              text-sm text-red-200
            "
          >
            <div className="space-y-1">
              <p className="font-medium text-red-100">
                Unable to load tenants.
              </p>
              <p className="text-red-200/80">
                {errorMessage ||
                  "Something went wrong while loading the tenant directory."}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Empty state */}
        {!isLoading && !isError && isEmpty && (
          <TenantDirectoryEmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        )}

        {/* Step 6: Grid content */}
        {!isLoading && !isError && !isEmpty && (
          <TenantDirectoryGrid>{children}</TenantDirectoryGrid>
        )}

        {/* Step 7: Footer */}
        {!isLoading && !isError && !isEmpty && footer ? footer : null}
      </div>
    </section>
  );
}