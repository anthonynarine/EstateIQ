// # Filename: src/features/expenses/components/ExpenseStatusBadge.tsx

import type { ExpenseListItem } from "../api/expensesTypes";

/**
 * Props for the ExpenseStatusBadge component.
 */
interface ExpenseStatusBadgeProps {
  expense: Pick<ExpenseListItem, "is_archived" | "archived_at">;
}

/**
 * ExpenseStatusBadge
 *
 * Displays the operational state of an expense record in a compact badge.
 *
 * Why this component exists:
 * - archive state is important to operational users
 * - archive state impacts reporting visibility
 * - the page/table should not repeat badge styling logic inline
 *
 * Current behavior:
 * - Active expenses render a positive badge
 * - Archived expenses render a muted warning badge
 *
 * This component is intentionally presentation-focused.
 * It does not own mutation behavior or data fetching.
 *
 * @param props Component props.
 * @returns A lightweight status badge for an expense row.
 */
export default function ExpenseStatusBadge({
  expense,
}: ExpenseStatusBadgeProps) {
  // # Step 1: Derive archive state from the expense record.
  const isArchived = Boolean(expense.is_archived);

  // # Step 2: Build the label shown to the user.
  const label = isArchived ? "Archived" : "Active";

  // # Step 3: Build a small hover title for extra context.
  const title = isArchived && expense.archived_at
    ? `Archived on ${expense.archived_at}`
    : isArchived
      ? "This expense is archived and excluded from default reporting."
      : "This expense is active and included in operational views.";

  // # Step 4: Return a compact badge with state-aware styling.
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        isArchived
          ? "bg-amber-100 text-amber-800"
          : "bg-emerald-100 text-emerald-800",
      ].join(" ")}
    >
      {label}
    </span>
  );
}