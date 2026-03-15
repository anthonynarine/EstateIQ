// # Filename: src/features/tenants/components/directory/TenantDirectoryToolbar.tsx
// ✅ New Code

import type { ReactNode } from "react";
import { Plus, Search } from "lucide-react";

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddTenant: () => void;
  isAddDisabled?: boolean;
  addButtonLabel?: string;
  addButtonIcon?: ReactNode;
};

/**
 * TenantDirectoryToolbar
 *
 * Mobile-first toolbar for the tenant directory.
 *
 * Responsibilities:
 * - Render the tenant search input.
 * - Render the "Add Tenant" action.
 * - Stack cleanly on small screens and align horizontally on larger screens.
 *
 * Important:
 * - This component is presentational only.
 * - It does not own modal state, query state, or URL state.
 */
export default function TenantDirectoryToolbar({
  searchValue,
  onSearchChange,
  onAddTenant,
  isAddDisabled = false,
  addButtonLabel = "Add Tenant",
  addButtonIcon,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Step 1: Search input block */}
      <div className="w-full sm:max-w-xl">
        <label htmlFor="tenant-search" className="sr-only">
          Search tenants
        </label>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />

          <input
            id="tenant-search"
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, or phone"
            className="
              w-full rounded-2xl border border-white/10 bg-neutral-900/80
              py-2.5 pl-10 pr-4 text-sm text-white outline-none transition
              placeholder:text-neutral-500
              focus:border-cyan-400/40 focus:bg-neutral-900
              focus:ring-2 focus:ring-cyan-500/20
            "
          />
        </div>
      </div>

      {/* Step 2: Add tenant action */}
      <button
        type="button"
        onClick={onAddTenant}
        disabled={isAddDisabled}
        className="
          inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
          border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-sm
          font-medium text-cyan-200 transition
          hover:border-cyan-300/30 hover:bg-cyan-500/15
          focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          disabled:cursor-not-allowed disabled:opacity-50
          sm:w-auto
        "
      >
        {addButtonIcon ?? <Plus className="h-4 w-4" />}
        <span>{addButtonLabel}</span>
      </button>
    </div>
  );
}