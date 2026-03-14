
// # Filename: src/features/leases/components/LeaseCard/LeaseSummaryGrid.tsx
// ✅ New Code

import { CalendarDays, CircleDollarSign, ShieldCheck } from "lucide-react";
import { formatMoney } from "./formatters";

interface LeaseSummaryGridProps {
  rentAmount: string;
  rentDueDay: number;
  securityDepositAmount: string | null;
}

/**
 * LeaseSummaryGrid
 *
 * Compact summary rail for lease financial and schedule details.
 * Designed to feel lighter and less bulky inside the lease card.
 */
export default function LeaseSummaryGrid({
  rentAmount,
  rentDueDay,
  securityDepositAmount,
}: LeaseSummaryGridProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="grid gap-0 sm:grid-cols-3">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="rounded-lg bg-emerald-400/10 p-1.5">
            <CircleDollarSign className="h-3.5 w-3.5 text-emerald-300" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Rent
            </p>
            <p className="text-sm font-semibold text-white">
              ${formatMoney(rentAmount)}
            </p>
          </div>
        </div>

        <div className="border-t border-white/8 sm:border-l sm:border-t-0">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="rounded-lg bg-white/5 p-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-neutral-300" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Due day
              </p>
              <p className="text-sm font-semibold text-white">{rentDueDay}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 sm:border-l sm:border-t-0">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="rounded-lg bg-cyan-400/10 p-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Deposit
              </p>
              <p className="text-sm font-semibold text-white">
                {securityDepositAmount
                  ? `$${formatMoney(securityDepositAmount)}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}