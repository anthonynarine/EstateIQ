// # Filename: src/features/expenses/components/ExpenseStatusBadge.tsx

interface ExpenseStatusBadgeProps {
  isArchived?: boolean;
}

export default function ExpenseStatusBadge({
  isArchived = false,
}: ExpenseStatusBadgeProps) {
  return (
    <span
      className={
        isArchived
          ? "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
          : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
      }
    >
      {isArchived ? "Archived" : "Active"}
    </span>
  );
}