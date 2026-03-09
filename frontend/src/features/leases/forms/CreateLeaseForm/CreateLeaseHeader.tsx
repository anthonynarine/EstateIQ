// # Filename: src/features/leases/forms/CreateLeaseHeader.tsx


import { ChevronDown, ChevronUp, FilePlus2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * CreateLeaseHeader
 *
 * Header block for the unit-first lease creation workflow.
 *
 * Responsibilities:
 * - Render the lease creation title and helper copy
 * - Render the open / close button
 * - Keep the top of CreateLeaseForm.tsx small and readable
 *
 * Design goals:
 * - Mobile-first layout
 * - Premium dark workspace styling
 * - Clean hierarchy without extra wrapper heaviness
 */
export default function CreateLeaseHeader({
  isOpen,
  onToggle,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
            <FilePlus2 className="h-5 w-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Lease creation
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Create lease for this unit
            </h3>

            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Assign a tenant and define lease terms for this property.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="
          inline-flex min-h-11 w-full items-center justify-center gap-2
          rounded-2xl border border-cyan-400/20 bg-cyan-500/10
          px-4 py-2.5 text-sm font-medium text-cyan-200 transition
          duration-200 hover:border-cyan-300/30 hover:bg-cyan-500/15
          focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          sm:w-auto
        "
      >
        {isOpen ? (
          <>
            <ChevronUp className="h-4 w-4 transition-transform duration-200" />
            <span>Close lease form</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            <span>Add lease</span>
          </>
        )}
      </button>
    </div>
  );
}