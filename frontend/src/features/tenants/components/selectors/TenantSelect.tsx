// # Filename: src/features/tenants/components/selectors/TenantSelect.tsx
// ✅ New Code

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, User2 } from "lucide-react";

import { useTenantsQuery } from "../../hooks/useTenantsQuery";

type Props = {
  orgSlug: string;
  tenantId: number | null;
  onChange: (tenantId: number | null) => void;
  label?: string;
  helperText?: string;
};

/**
 * formatTenantSecondaryText
 *
 * Builds a compact secondary descriptor for a tenant row.
 *
 * @param email Tenant email if available.
 * @returns Secondary display text.
 */
function formatTenantSecondaryText(email?: string | null): string {
  // Step 1: Prefer email when available
  if (email && email.trim()) {
    return email;
  }

  // Step 2: Fall back to a neutral label
  return "No email on file";
}

/**
 * TenantSelect
 *
 * Custom dark tenant selector for lease workflows.
 *
 * Why custom instead of native select:
 * - Native select dropdown menus are browser/OS controlled.
 * - They often ignore dark theming.
 * - They animate poorly and break premium dashboard styling.
 *
 * This component provides:
 * - dark trigger
 * - dark dropdown panel
 * - smooth open / close behavior
 * - lightweight client-side search
 */
export default function TenantSelect({
  orgSlug,
  tenantId,
  onChange,
  label = "Primary tenant",
  helperText = "Select the tenant for this lease (optional for now).",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data, isLoading, isError, error, refetch } = useTenantsQuery({
    orgSlug,
    page: 1,
    pageSize: 100,
    search: "",
  });

  // Step 2: Stable sorting for consistent UX
  const options = useMemo(() => {
    const tenants = data?.results ?? [];
    return [...tenants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [data]);

  // Step 3: Apply lightweight client-side search
  const filteredOptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((tenant) => {
      const haystack = [
        tenant.full_name,
        tenant.email ?? "",
        tenant.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [options, searchValue]);

  // Step 4: Selected tenant lookup for trigger text
  const selectedTenant = useMemo(() => {
    if (tenantId == null) {
      return null;
    }

    return options.find((tenant) => tenant.id === tenantId) ?? null;
  }, [options, tenantId]);

  // Step 5: Close on outside click
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  // Step 6: Focus search when dropdown opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  // Step 7: Keyboard escape support
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading tenants…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-100">Couldn’t load tenants.</p>
        <p className="mt-1 text-xs text-red-200/80">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>

        <button
          type="button"
          onClick={async () => {
            await refetch();
          }}
          className="
            mt-3 inline-flex min-h-10 items-center justify-center rounded-xl
            border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium
            text-white/80 transition hover:bg-white/10
          "
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {label ? (
        <label className="block text-xs font-medium text-neutral-300">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((value) => !value)}
          className={[
            "flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border",
            "border-white/10 bg-neutral-950/80 px-3.5 py-2.5 text-left text-sm text-white",
            "outline-none transition duration-200",
            "hover:border-white/15 hover:bg-neutral-950",
            "focus:border-cyan-400/20 focus:ring-2 focus:ring-cyan-500/10",
            isOpen ? "border-cyan-400/20 ring-2 ring-cyan-500/10" : "",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300">
              <User2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              {selectedTenant ? (
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {selectedTenant.full_name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {formatTenantSecondaryText(selectedTenant.email)}
                  </p>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    No tenant selected
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    Choose an existing tenant
                  </p>
                </div>
              )}
            </div>
          </div>

          <ChevronDown
            className={[
              "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        <div
          className={[
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 origin-top rounded-2xl",
            "border border-white/10 bg-neutral-950/95 shadow-2xl backdrop-blur",
            "transition duration-200 ease-out",
            isOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
          ].join(" ")}
        >
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search tenants..."
                className="
                  h-10 w-full bg-transparent text-sm text-white outline-none
                  placeholder:text-neutral-500
                "
              />
            </div>
          </div>

          <div className="tenant-select-scroll max-h-72 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setSearchValue("");
              }}
              className={[
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                tenantId == null
                  ? "bg-cyan-500/10 text-cyan-200"
                  : "text-neutral-200 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">No tenant selected</p>
                <p className="truncate text-xs text-neutral-500">
                  Leave the lease without an attached tenant for now
                </p>
              </div>

              {tenantId == null ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm font-medium text-neutral-300">
                  No tenants found
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Try a different name, email, or phone search.
                </p>
              </div>
            ) : (
              filteredOptions.map((tenant) => {
                const isSelected = tenant.id === tenantId;

                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => {
                      onChange(tenant.id);
                      setIsOpen(false);
                      setSearchValue("");
                    }}
                    className={[
                      "mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      isSelected
                        ? "bg-cyan-500/10 text-cyan-200"
                        : "text-neutral-200 hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tenant.full_name}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {formatTenantSecondaryText(tenant.email)}
                      </p>
                    </div>

                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {helperText ? (
        <p className="text-xs leading-5 text-neutral-500">{helperText}</p>
      ) : null}
    </div>
  );
}