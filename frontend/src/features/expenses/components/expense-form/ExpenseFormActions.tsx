// # Filename: src/features/expenses/components/expense-form/ExpenseFormActions.tsx



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
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
            ? "Create Expense"
            : "Save Changes"}
      </button>
    </div>
  );
}