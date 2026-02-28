// # Filename: src/features/buildings/components/BuildingHeader.tsx

type Props = {
  orgSlug: string | null;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
};

/**
 * BuildingHeader
 *
 * Presentational header for the Buildings page.
 * Shows title, subtitle, org slug, and "Add building" toggle button.
 */
export default function BuildingHeader({
  orgSlug,
  isCreateOpen,
  onToggleCreate,
}: Props) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-white">Portfolio</h1>
        <p className="mt-1 text-sm text-white/70">
          Manage your properties at the building level.
        </p>
        <p className="mt-2 text-xs text-white/50">
          {orgSlug ? `Org: ${orgSlug}` : "No org selected"}
        </p>
      </div>

      <button
        type="button"
        className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
        onClick={onToggleCreate}
      >
        {isCreateOpen ? "Close" : "Add building"}
      </button>
    </header>
  );
}