// # Filename: src/features/leases/components/LeaseCard/LeaseActions.tsx

import { Pencil } from "lucide-react";

interface LeaseActionsProps {
  compact?: boolean;
  onEdit: () => void;
}

/**
 * LeaseActions
 *
 * Presentational action area for lease-card edit controls.
 */
export default function LeaseActions({
  compact = false,
  onEdit,
}: LeaseActionsProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
        title="Edit lease"
      >
        <Pencil className="h-4 w-4 text-neutral-200" />
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
        title="Edit lease"
      >
        <Pencil className="h-4 w-4 text-neutral-200" />
      </button>
    </div>
  );
}