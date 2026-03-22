// # Filename: src/features/expenses/pages/components/ExpensesHeader.tsx

// ✅ New Code

import ExpensesWorkspaceTabs, {
  type ExpensesWorkspaceTab,
} from "../../components/ExpensesWorkspaceTabs";

/**
 * Props for the ExpensesHeader component.
 */
interface ExpensesHeaderProps {
  isEditing: boolean;
  onCreateNew: () => void;
  activeWorkspace: ExpensesWorkspaceTab;
  onWorkspaceChange: (nextValue: ExpensesWorkspaceTab) => void;
}

const HEADER_SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const HEADER_INNER_CLASS = "flex flex-col gap-3 p-4 sm:p-5";

const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

const TITLE_CLASS = "text-2xl font-semibold tracking-tight text-white";

const DESCRIPTION_CLASS = "text-sm leading-5 text-neutral-400";

const ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70";

/**
 * Page-level header for the Expenses feature.
 *
 * Design intent:
 * - mobile uses two rows for comfort
 * - desktop collapses into one intentional control row
 *
 * @param props Component props.
 * @returns Expenses page header UI.
 */
export default function ExpensesHeader({
  isEditing,
  onCreateNew,
  activeWorkspace,
  onWorkspaceChange,
}: ExpensesHeaderProps) {
  return (
    <section className={HEADER_SHELL_CLASS}>
      <div className={HEADER_INNER_CLASS}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-1 xl:max-w-sm">
            <p className={EYEBROW_CLASS}>Portfolio workspace</p>
            <h1 className={TITLE_CLASS}>Expenses</h1>
            <p className={`${DESCRIPTION_CLASS} xl:hidden`}>
              Manage records and reporting.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
            <ExpensesWorkspaceTabs
              value={activeWorkspace}
              onChange={onWorkspaceChange}
            />

            {isEditing ? (
              <button
                type="button"
                onClick={onCreateNew}
                className={ACTION_BUTTON_CLASS}
              >
                New expense
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}