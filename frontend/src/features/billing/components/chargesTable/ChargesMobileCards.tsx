
// # Filename: src/features/billing/components/ChargesMobileCards.tsx

import type { LeaseLedgerCharge } from "../../api/billingTypes";
import {
  formatChargeKindLabel,
  formatCurrencyValue,
  formatDateValue,
  getChargeDisplayState,
  getChargeMobileSecondaryText,
  isChargePayable,
} from "./chargesTableUtils";

/**
 * ChargesMobileCardsProps
 *
 * Mobile-only card props for charge rendering.
 */
export interface ChargesMobileCardsProps {
  charges: LeaseLedgerCharge[];
  onPayCharge?: (charge: LeaseLedgerCharge) => void;
}

/**
 * ChargesMobileCards
 *
 * Mobile card renderer for charges with optional row-level pay actions.
 *
 * @param props Mobile card props.
 * @returns Mobile card markup.
 */
export default function ChargesMobileCards({
  charges,
  onPayCharge,
}: ChargesMobileCardsProps) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {charges.map((charge) => {
        // Step 1: Build display helpers for this row.
        const displayState = getChargeDisplayState(charge);
        const secondaryText = getChargeMobileSecondaryText(charge);
        const canPay = isChargePayable(charge);

        return (
          <article
            key={String(charge.id)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatChargeKindLabel(charge.kind)}
                </p>

                {secondaryText ? (
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {secondaryText}
                  </p>
                ) : null}
              </div>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${displayState.classes}`}
              >
                {displayState.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Due Date
                </p>
                <p className="mt-1 text-sm text-white">
                  {formatDateValue(charge.due_date)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Amount
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrencyValue(charge.amount)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Remaining
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrencyValue(charge.remaining_balance)}
                </p>
              </div>
            </div>

            {canPay && onPayCharge ? (
              <div className="mt-4">
                <button
                  className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                  onClick={() => {
                    onPayCharge(charge);
                  }}
                  type="button"
                >
                  Pay this charge
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}