// # Filename: src/features/expenses/pages/components/ExpensesWorkspaceTabs.tsx

// ✅ New Code

export type ExpensesWorkspaceTab = "records" | "reporting";

/**
 * Props for the ExpensesWorkspaceTabs component.
 */
interface ExpensesWorkspaceTabsProps {
  value: ExpensesWorkspaceTab;
  onChange: (nextValue: ExpensesWorkspaceTab) => void;
}

const WRAPPER_CLASS =
  "inline-flex w-full max-w-fit items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950/90 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const BASE_TAB_CLASS =
  "rounded-lg px-3.5 py-1.5 text-sm font-medium tracking-tight transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 sm:px-4 sm:py-2";

const ACTIVE_TAB_CLASS =
  "bg-emerald-500/10 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.28)]";

const INACTIVE_TAB_CLASS =
  "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200";

/**
 * Returns the complete class string for a workspace tab button.
 *
 * @param isActive Whether the current tab is active.
 * @returns Tailwind class string.
 */
function getTabClassName(isActive: boolean): string {
  return `${BASE_TAB_CLASS} ${
    isActive ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS
  }`;
}

/**
 * Segmented workspace tabs for the Expenses page.
 *
 * Product intent:
 * - Records = operational workflow
 * - Reporting = analytical workflow
 *
 * Design intent:
 * - compact enough to sit cleanly inside the slimmer page header
 * - still finger-friendly on mobile
 *
 * @param props Component props.
 * @returns Tab switcher for the Expenses page workspace.
 */
export default function ExpensesWorkspaceTabs({
  value,
  onChange,
}: ExpensesWorkspaceTabsProps) {
  return (
    <div
      className={WRAPPER_CLASS}
      role="tablist"
      aria-label="Expenses workspace"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "records"}
        className={getTabClassName(value === "records")}
        onClick={() => onChange("records")}
      >
        Records
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={value === "reporting"}
        className={getTabClassName(value === "reporting")}
        onClick={() => onChange("reporting")}
      >
        Reporting
      </button>
    </div>
  );
}