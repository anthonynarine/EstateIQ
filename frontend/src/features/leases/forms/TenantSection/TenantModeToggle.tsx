// # Filename: src/features/leases/forms/TenantSection/TenantModeToggle.tsx
// ✅ New Code

import type { TenantMode } from "./tenantTypes";

type Props = {
  mode: TenantMode;
  onModeChange: (mode: TenantMode) => void;
};

/**
 * TenantModeToggle
 *
 * Premium segmented control for switching tenant entry mode.
 */
export default function TenantModeToggle({ mode, onModeChange }: Props) {
  return (
    <div className="inline-flex w-fit rounded-2xl border border-neutral-800 bg-neutral-950 p-1">
      <button
        type="button"
        onClick={() => onModeChange("select")}
        className={[
          "rounded-xl px-4 py-2 text-sm font-medium transition",
          mode === "select"
            ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            : "text-neutral-400 hover:text-neutral-200",
        ].join(" ")}
      >
        Select existing
      </button>

      <button
        type="button"
        onClick={() => onModeChange("create")}
        className={[
          "rounded-xl px-4 py-2 text-sm font-medium transition",
          mode === "create"
            ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            : "text-neutral-400 hover:text-neutral-200",
        ].join(" ")}
      >
        Create new
      </button>
    </div>
  );
}