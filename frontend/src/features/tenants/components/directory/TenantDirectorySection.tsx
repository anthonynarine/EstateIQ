// # Filename: src/features/tenants/components/directory/TenantDirectorySection.tsx
// ✅ New Code

import type { ReactNode } from "react";

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
 * - Render section header + tenant count
 * - Compose toolbar, body states, card grid, and footer slot
 * - Keep the page layer thin by centralizing section layout
 *
 * Important:
 * - This component does not fetch data
 * - This component does not own modal state
 * - This component does not own route/query logic
 * - Pagination is injected from the page layer through `footer`
 */
export default function TenantDirectorySection({
  tenantsCount,
  searchValue,
  onSearchChange,
  onAddTenant,
  addButtonLabel,
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
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
      <div className="space-y-5">
        {/* Step 1: Section heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-white sm:text-lg">
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

            <p className="text-sm text-neutral-400">
              Search tenants, review occupancy context, and launch lease actions.
            </p>
          </div>
        </div>

        {/* Step 2: Toolbar */}
        <TenantDirectoryToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onAddTenant={onAddTenant}
          addButtonLabel={addButtonLabel}
          addButtonIcon={addButtonIcon}
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

        {/* Step 7: Footer slot */}
{!isLoading && !isError && !isEmpty && footer ? footer : null}
      </div>
    </section>
  );
}