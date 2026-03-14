// # Filename: src/features/leases/components/CurrentLeasePanel.tsx


import { AlertTriangle, FileText, Home, Loader2, Sparkles } from "lucide-react";
import CreateLeaseForm from "../forms/CreateLeaseForm/CreateLeaseForm";
import LeaseCard from "./LeaseCard/LeaseCard";
import type { Lease } from "../api/types";

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
 * Premium presentational workspace panel for the unit lease state.
 *
 * Design goals:
 * - cleaner hierarchy
 * - lighter surface treatment
 * - let LeaseCard own most lease detail display
 * - keep create/edit states obvious without feeling bulky
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
}: Props) {
  const stateBadge = currentLease
    ? "Active lease"
    : draftLease
    ? "Draft lease"
    : canCreateNewLease
    ? "Vacant"
    : blockingLease
    ? "Blocked"
    : "No lease";

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950 via-neutral-950 to-neutral-900 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/[0.04] bg-white/[0.02] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
              <Home className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Lease workspace
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Current lease
              </h2>

              <p className="max-w-2xl text-sm text-neutral-400">
                Deterministic lease state for this unit as of{" "}
                <span className="font-medium text-neutral-300">{todayISO}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            {stateBadge}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-300">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            Loading lease workspace…
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-4 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <p className="font-medium text-red-200">Failed to load leases</p>
              <p className="mt-1 text-red-200/80">
                We couldn&apos;t load the lease state for this unit.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {currentLease ? (
              <>
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-4">
                  <div className="rounded-xl bg-emerald-500/10 p-2">
                    <FileText className="h-4 w-4 text-emerald-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-200">
                      An active lease is attached to this unit.
                    </p>
                    <p className="mt-1 text-sm text-emerald-200/80">
                      Review or edit the lease below. To create a future lease,
                      this current lease must be ended first.
                    </p>
                  </div>
                </div>

                <LeaseCard
                  lease={currentLease}
                  orgSlug={orgSlug}
                  unitId={unitId}
                  displayLabel="Current lease"
                />
              </>
            ) : draftLease ? (
              <>
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-4">
                  <div className="rounded-xl bg-amber-500/10 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-200">
                      A draft lease is blocking new lease creation.
                    </p>
                    <p className="mt-1 text-sm text-amber-200/80">
                      Finish or edit the draft below before creating another
                      lease for this unit.
                    </p>
                  </div>
                </div>

                <LeaseCard
                  lease={draftLease}
                  orgSlug={orgSlug}
                  unitId={unitId}
                  displayLabel="Draft lease"
                />
              </>
            ) : canCreateNewLease ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-4">
                  <div className="rounded-xl bg-cyan-400/10 p-2">
                    <Home className="h-4 w-4 text-cyan-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cyan-200">
                      This unit is currently vacant.
                    </p>
                    <p className="mt-1 text-sm text-cyan-200/80">
                      You can create a new lease now.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
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
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="font-medium text-neutral-200">
                    Lease creation is currently blocked.
                  </p>
                  <p className="mt-1 text-neutral-400">
                    This unit has lease state that prevents creating a new lease
                    right now.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}