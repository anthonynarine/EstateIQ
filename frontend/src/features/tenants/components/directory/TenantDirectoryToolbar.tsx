// # Filename: src/features/tenants/components/directory/TenantDirectoryToolbar.tsx
// ✅ New Code

import { Search, X } from "lucide-react";

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
};

export default function TenantDirectoryToolbar({
  searchValue,
  onSearchChange,
  onClearSearch,
}: Props) {
  const hasSearchValue = searchValue.trim().length > 0;

  return (
    <div className="pt-0.5">
      <div className="w-full">
        <label htmlFor="tenant-search" className="sr-only">
          Search tenants
        </label>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />

          <input
            id="tenant-search"
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, or phone"
            className="
              h-11 w-full rounded-xl border border-white/10 bg-neutral-900/80
              pl-11 pr-12 text-sm text-white outline-none transition
              placeholder:text-neutral-500
              focus:border-cyan-400/40 focus:bg-neutral-900
              focus:ring-2 focus:ring-cyan-500/20
            "
          />

          {hasSearchValue ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="
                absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2
                items-center justify-center rounded-full bg-white/5 text-neutral-400
                transition hover:bg-white/10 hover:text-white
                focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              "
              aria-label="Clear tenant search"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}