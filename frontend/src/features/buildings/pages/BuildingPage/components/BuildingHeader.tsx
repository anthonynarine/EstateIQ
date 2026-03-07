// # Filename: src/features/buildings/pages/BuildingPage/components/BuildingHeader.tsx


type Props = {
  orgSlug: string | null;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
};

/**
 * BuildingHeader
 *
 * Premium mobile-first header for the Buildings page.
 *
 * Responsibilities:
 * - Show page identity
 * - Show org context
 * - Provide create toggle
 *
 * Non-responsibilities:
 * - No fetching
 * - No mutation logic
 */
export default function BuildingHeader({
  orgSlug,
  isCreateOpen,
  onToggleCreate,
}: Props) {
  return (
    <header className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Portfolio workspace
              </p>

              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Buildings
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-neutral-400">
                Manage properties at the building level, then drill into units,
                leases, and occupancy from each building workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
                {orgSlug ? `Org: ${orgSlug}` : "No org selected"}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleCreate}
              className={[
                "w-full rounded-xl px-4 py-2.5 text-sm font-medium transition sm:w-auto",
                isCreateOpen
                  ? "border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
                  : "bg-white text-black hover:bg-white/90",
              ].join(" ")}
            >
              {isCreateOpen ? "Close form" : "Add building"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}