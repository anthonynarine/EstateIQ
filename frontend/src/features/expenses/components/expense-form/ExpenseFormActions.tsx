// # Filename: src/features/expenses/components/expense-form/ExpenseFormActions.tsx
// ✅ New Code

import { PlusCircle, Check } from "lucide-react";

interface ExpenseFormActionsProps {
  mode: "create" | "edit";
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function ExpenseFormActions({
  mode,
  isSubmitting = false,
  onCancel,
}: ExpenseFormActionsProps) {
  const isCreateMode = mode === "create";

  const buttonLabel = isSubmitting
    ? isCreateMode
      ? "Creating..."
      : "Saving..."
    : isCreateMode
      ? "Create Expense"
      : "Save Changes";

  return (
    <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-center">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
        >
          Cancel
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/15 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
      >
        {isCreateMode ? (
          <PlusCircle className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}

        {buttonLabel}
      </button>
    </div>
  );
}