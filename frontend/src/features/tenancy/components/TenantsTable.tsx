// # Filename: src/features/tenancy/components/LeasesTable.tsx

import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Lease } from "../types";

type Props = {
  leases: Lease[];
  isLoading: boolean;
  isFetching: boolean;
};

/**
 * LeasesTable
 *
 * Presentational component:
 * - renders leases
 * - shows loading/empty states
 * - displays parties_detail
 */
export default function LeasesTable({ leases, isLoading, isFetching }: Props) {
  // Step 1: Format rows (stable)
  const rows = useMemo(() => {
    return leases.map((l) => {
      const parties =
        l.parties_detail?.length
          ? l.parties_detail
              .map((p) => `${p.tenant.full_name} (${p.role})`)
              .join(", ")
          : "—";

      return {
        id: l.id,
        status: l.status,
        start_date: l.start_date,
        rent_amount: l.rent_amount,
        rent_due_day: l.rent_due_day ?? "—",
        security_deposit_amount: l.security_deposit_amount
          ? `$${l.security_deposit_amount}`
          : "—",
        parties,
      };
    });
  }, [leases]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-200">Leases</div>
            <div className="mt-1 text-xs text-zinc-500">
              {isFetching && !isLoading ? "Updating…" : " "}
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Total: <span className="text-zinc-300">{leases.length}</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Start</th>
                <th className="py-3 pr-4">Rent</th>
                <th className="py-3 pr-4">Due Day</th>
                <th className="py-3 pr-4">Deposit</th>
                <th className="py-3 pr-4">Parties</th>
                <th className="py-3 pr-4">Lease ID</th>

                {/* Step 2: Actions column */}
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-400" colSpan={8}>
                    Loading leases…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-400" colSpan={8}>
                    No leases found for this unit.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-900/60">
                    <td className="py-3 pr-4">
                      <span className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-2 py-1 text-xs text-zinc-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-200">{r.start_date}</td>
                    <td className="py-3 pr-4 text-zinc-200">${r.rent_amount}</td>
                    <td className="py-3 pr-4 text-zinc-300">{r.rent_due_day}</td>
                    <td className="py-3 pr-4 text-zinc-300">{r.security_deposit_amount}</td>
                    <td className="py-3 pr-4 text-zinc-300">{r.parties}</td>
                    <td className="py-3 pr-4 text-zinc-500">{r.id}</td>

                    {/* Step 3: Actions cell */}
                    <td className="py-3 pr-4 text-right">
                      <Link
                        to={`/dashboard/leases/${r.id}/ledger`}
                        className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900/50"
                      >
                        View Ledger
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}