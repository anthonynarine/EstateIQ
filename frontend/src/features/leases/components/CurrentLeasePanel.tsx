// # Filename: src/features/leases/components/CurrentLeasePanel.tsx


import CreateLeaseForm from "../forms/CreateLeaseForm/CreateLeaseForm";
import LeaseCard from "./LeaseCard";
import type { Lease } from "../api/leaseApi";

type Props = {
  todayISO: string;
  currentLease: Lease | null;
  draftLease: Lease | null;
  blockingLease: Lease | null;
  canCreateNewLease: boolean;
  isLoading: boolean;
  error: unknown;
  buildingId: number | null;
  buildingName: string;
  unitId: number;
  orgSlug: string;
  formatMoney: (raw: string | null | undefined) => string;
};

/**
 * CurrentLeasePanel
 *
 * Premium presentational workspace panel for current lease state.
 */
export default function CurrentLeasePanel({
  todayISO,
  currentLease,
  draftLease,
  blockingLease,
  canCreateNewLease,
  isLoading,
  error,
  unitId,
  buildingId,
  buildingName,
  orgSlug,
  formatMoney,
}: Props) {
  return (
    <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-400">
            Loading leases…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-300">
            Failed to load leases for this unit.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Lease workspace
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Current lease
                </h2>
                <p className="text-sm text-neutral-400">
                  Deterministic state based on lease status and active date range
                  ({todayISO})
                </p>
              </div>

              {blockingLease ? (
                <span className="w-fit rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
                  {currentLease ? "Active lease" : "Draft lease"}
                </span>
              ) : null}
            </div>

            {currentLease ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Rent
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {formatMoney(currentLease.rent_amount)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Due day
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {currentLease.rent_due_day ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Ends
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {currentLease.end_date || "Open"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-800/80 pt-5">
                  <LeaseCard
                    lease={currentLease}
                    orgSlug={orgSlug}
                    unitId={unitId}
                  />
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
                  A current lease exists. Edit it above. To create a new lease
                  later, set the current lease to ended.
                </div>
              </>
            ) : draftLease ? (
              <>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                  A draft lease is currently blocking creation of another lease
                  for this unit.
                </div>

                <LeaseCard
                  lease={draftLease}
                  orgSlug={orgSlug}
                  unitId={unitId}
                />

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
                  Finish or edit the draft before creating another lease.
                </div>
              </>
            ) : canCreateNewLease ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                  This unit is currently vacant. You can create a new lease now.
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4 sm:p-5">
                  <CreateLeaseForm
                    initialContext={{
                      orgSlug,
                      tenantId: null,
                      unitId,
                      buildingId,
                      buildingName,
                      launchMode: "unit-first",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
                This unit currently has lease state that blocks creating a new
                lease.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}