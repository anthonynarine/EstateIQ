// # Filename: src/features/leases/forms/FormActions.tsx
// ✅ New Code

type Props = {
  // Step 1: Async state
  isPending: boolean;

  // Step 2: Actions
  onCancel: () => void;
  onSubmit: () => void;

  // Step 3: Optional label overrides (future-proof for multi-step flows)
  submitLabel?: string;
  pendingLabel?: string;
};

/**
 * FormActions
 *
 * Presentational action row for lease-related forms (CreateLeaseForm now, EditLease later).
 *
 * Responsibilities:
 * - Render Cancel + Submit actions with consistent styling
 * - Disable actions while a mutation is pending
 * - Provide consistent labels for "idle" vs "pending" states
 *
 * Non-responsibilities:
 * - No validation logic
 * - No API/mutation logic
 * - No navigation
 *
 * Why this exists:
 * - Keeps CreateLeaseForm focused on orchestration and data flow
 * - Ensures future flows (create-tenant-then-lease) can reuse the same UX
 */
export default function FormActions({
  isPending,
  onCancel,
  onSubmit,
  submitLabel = "Create lease",
  pendingLabel = "Saving…",
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
        disabled={isPending}
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSubmit}
        className="rounded-lg border border-neutral-700 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}