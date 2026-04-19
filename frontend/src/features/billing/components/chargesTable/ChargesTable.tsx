
// # Filename: src/features/billing/components/ChargesTable.tsx

import type { LeaseLedgerCharge } from "../../api/types";
import ChargesDesktopTable from "./ChargesDesktopTable";
import ChargesMobileCards from "./ChargesMobileCards";

/**
 * LedgerTableVariant
 *
 * Controls whether the table renders as a full standalone card or as
 * an embeddable renderer inside a parent shell.
 */
type LedgerTableVariant = "standalone" | "embedded";

/**
 * ChargesTableProps
 *
 * Public props contract for the lease-ledger charges table.
 */
export interface ChargesTableProps {
  charges?: LeaseLedgerCharge[];
  isLoading?: boolean;
  emptyMessage?: string;
  variant?: LedgerTableVariant;
  onPayCharge?: (charge: LeaseLedgerCharge) => void;
}

/**
 * renderChargesContent
 *
 * Renders loading, empty, or populated charge content.
 *
 * @param charges Visible charge rows.
 * @param isLoading Whether the table is loading.
 * @param emptyMessage Empty state copy.
 * @param onPayCharge Optional row-level pay action.
 * @returns Charges content markup.
 */
function renderChargesContent(
  charges: LeaseLedgerCharge[],
  isLoading: boolean,
  emptyMessage: string,
  onPayCharge?: (charge: LeaseLedgerCharge) => void,
) {
  // Step 1: Render loading state.
  if (isLoading) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        Loading charges…
      </div>
    );
  }

  // Step 2: Render empty state.
  if (!charges.length) {
    return (
      <div className="px-5 py-12 text-center text-sm text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  // Step 3: Render desktop and mobile views.
  return (
    <>
      <ChargesDesktopTable charges={charges} onPayCharge={onPayCharge} />
      <ChargesMobileCards charges={charges} onPayCharge={onPayCharge} />
    </>
  );
}

/**
 * ChargesTable
 *
 * Presentational table for displaying lease-level charge rows inside the
 * billing ledger page.
 *
 * Responsibilities:
 * - render backend-derived charge rows
 * - show amount, remaining balance, and clear row state
 * - expose a row-level pay action for open charges
 * - support standalone and embeddable rendering
 *
 * @param props Charges table props.
 * @returns A styled charges table.
 */
export default function ChargesTable({
  charges = [],
  isLoading = false,
  emptyMessage = "No charges have been posted for this lease yet.",
  variant = "standalone",
  onPayCharge,
}: ChargesTableProps) {
  const content = renderChargesContent(
    charges,
    isLoading,
    emptyMessage,
    onPayCharge,
  );

  // Step 1: Allow embeddable rendering inside the ledger workspace shell.
  if (variant === "embedded") {
    return content;
  }

  // Step 2: Render the standalone card wrapper.
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-2 border-b border-neutral-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Charges</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Posted obligations, remaining balances, and row-level payment
            actions for this lease.
          </p>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          {isLoading
            ? "Loading"
            : `${charges.length} charge${charges.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {content}
    </section>
  );
}