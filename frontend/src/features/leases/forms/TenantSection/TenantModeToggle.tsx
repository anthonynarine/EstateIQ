// # Filename: src/features/leases/forms/TenantSection/TenantModeToggle.tsx

import type { TenantMode } from "./tenantTypes";

type Props = {
  // Step 1: Current mode
  mode: TenantMode;

  // Step 2: Mode setter
  onModeChange: (mode: TenantMode) => void;
};

/**
 * TenantModeToggle
 *
 * Presentational toggle that switches between:
 * - selecting an existing tenant
 * - creating a new tenant inline
 *
 * Responsibilities:
 * - Render the toggle UI
 * - Emit mode changes upward
 *
 * Non-responsibilities:
 * - No tenant draft state
 * - No API calls
 */
export default function TenantModeToggle({ mode, onModeChange }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onModeChange("select")}
        className={[
          "rounded-lg border px-3 py-1.5 text-xs",
          mode === "select"
            ? "border-neutral-600 bg-white/10 text-white"
            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900",
        ].join(" ")}
      >
        Select existing
      </button>

      <button
        type="button"
        onClick={() => onModeChange("create")}
        className={[
          "rounded-lg border px-3 py-1.5 text-xs",
          mode === "create"
            ? "border-neutral-600 bg-white/10 text-white"
            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900",
        ].join(" ")}
      >
        Create new
      </button>
    </div>
  );
}