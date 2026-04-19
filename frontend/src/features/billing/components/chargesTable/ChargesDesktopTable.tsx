
// # Filename: src/features/billing/components/ChargesDesktopTable.tsx

import type { LeaseLedgerCharge } from "../../api/types";
import {
  formatChargeKindLabel,
  formatCurrencyValue,
  formatDateValue,
  getChargeDesktopPreview,
  getChargeDisplayState,
  isChargePayable,
} from "./chargesTableUtils";

/**
 * ChargesDesktopTableProps
 *
 * Desktop-only table props for charge rendering.
 */
export interface ChargesDesktopTableProps {
  charges: LeaseLedgerCharge[];
  onPayCharge?: (charge: LeaseLedgerCharge) => void;
}

/**
 * Shared compact desktop body cell spacing.
 */
const DESKTOP_TABLE_CELL_CLASS = "px-4 py-3.5 align-top text-sm";

/**
 * Shared compact desktop header cell styling.
 */
const DESKTOP_TABLE_HEADER_CLASS =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500";

/**
 * ChargesDesktopTable
 *
 * Compact desktop charge table with a row-level payment action.
 *
 * @param props Desktop table props.
 * @returns Desktop table markup.
 */
export default function ChargesDesktopTable({
  charges,
  onPayCharge,
}: ChargesDesktopTableProps) {
  return (
    <div className="hidden md:block">
      <table className="min-w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[16%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
        </colgroup>

        <thead className="bg-white/[0.02]">
          <tr className="text-left">
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Charge</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Due Date</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Amount</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Remaining</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>Action</th>
            <th className={DESKTOP_TABLE_HEADER_CLASS}>State</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/80">
          {charges.map((charge) => {
            // Step 1: Build display helpers for this row.
            const displayState = getChargeDisplayState(charge);
            const desktopPreview = getChargeDesktopPreview(charge);
            const canPay = isChargePayable(charge);

            return (
              <tr
                key={String(charge.id)}
                className="transition hover:bg-white/[0.02]"
              >
                <td className={`${DESKTOP_TABLE_CELL_CLASS} text-neutral-200`}>
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <span className="truncate font-medium text-white">
                      {formatChargeKindLabel(charge.kind)}
                    </span>

                    {desktopPreview ? (
                      <span
                        className="truncate text-xs text-neutral-500"
                        title={desktopPreview}
                      >
                        · {desktopPreview}
                      </span>
                    ) : null}
                  </div>
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatDateValue(charge.due_date)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap font-medium text-white`}
                >
                  {formatCurrencyValue(charge.amount)}
                </td>

                <td
                  className={`${DESKTOP_TABLE_CELL_CLASS} whitespace-nowrap text-neutral-300`}
                >
                  {formatCurrencyValue(charge.remaining_balance)}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
                  {canPay && onPayCharge ? (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                      onClick={() => {
                        onPayCharge(charge);
                      }}
                      type="button"
                    >
                      Pay
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </td>

                <td className={DESKTOP_TABLE_CELL_CLASS}>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${displayState.classes}`}
                  >
                    {displayState.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}