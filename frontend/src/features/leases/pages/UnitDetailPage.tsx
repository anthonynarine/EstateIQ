// # Filename: src/features/units/pages/UnitDetailPage.tsx

import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useOrg } from "../../tenancy/hooks/useOrg";
import CreateLeaseForm from "../forms/CreateLeaseForm";
import LeasesList from "../components/LeaseList";
import LeaseCard from "../../leases/components/LeaseCard"; 
import { useLeasesByUnitQuery } from "../../leases/queries/useLeasesByUnitQuery";
import {
  getCurrentLease,
  getTodayISO,
  getUnitOccupancyStatus,
} from "../../leases/utils/occupancy";

/**
 * UnitDetailPage
 *
 * UX rules (enterprise-grade):
 * - A Unit may have many leases over time (history)
 * - A Unit may have only ONE active lease at a time (DB constraint)
 * - If there is a current lease (active-in-range OR draft), we HIDE CreateLeaseForm
 *   and focus the user on editing/ending the current lease.
 *
 * Determinism:
 * - Occupancy is derived solely from lease data + todayISO (no UI guesses)
 * - Query is org-scoped (["org", orgSlug, ...]) upstream
 */
export default function UnitDetailPage() {
  // Step 1: Resolve params + org
  const { unitId } = useParams<{ unitId: string }>();
  const { orgSlug } = useOrg();

  // Step 2: Parse/validate unitId
  const unitIdNumber = useMemo(() => {
    if (!unitId) return null;
    const n = Number(unitId);
    return Number.isFinite(n) ? n : null;
  }, [unitId]);

  // Step 3: Compute enabled flag (prevents requests safely)
  const enabled = Boolean(orgSlug) && typeof unitIdNumber === "number";

  // Step 4: Hooks must be called unconditionally
  const leasesQuery = useLeasesByUnitQuery({
    orgSlug,
    unitId: unitIdNumber,
    enabled,
  });

  // Step 5: Derive occupancy (deterministic)
  const todayISO = useMemo(() => getTodayISO(), []);
  const leases = leasesQuery.data ?? [];

  const occupancy = useMemo(() => {
    return getUnitOccupancyStatus(leases, todayISO);
  }, [leases, todayISO]);

  // Step 6: Current lease (active in-range preferred)
  const currentLease = useMemo(() => {
    return getCurrentLease(leases, todayISO);
  }, [leases, todayISO]);

  // Step 7: Draft lease guard (draft should also block new lease creation)
  const draftLease = useMemo(() => {
    return leases.find((l) => l.status === "draft") ?? null;
  }, [leases]);

  // Step 8: Block “create new lease” if draft exists OR current active exists
  const blockingLease = currentLease ?? draftLease;
  const canCreateNewLease = !blockingLease;

  // Step 9: Now safe to early-return (hook already called)
  if (!orgSlug) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Organization not selected. Add ?org=&lt;slug&gt; to the URL.
        </div>
      </div>
    );
  }

  if (!unitIdNumber) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Invalid unit ID.
        </div>
      </div>
    );
  }

  // Step 10: Helpers (local formatting)
  const formatMoney = (raw: string | null | undefined) => {
    if (!raw) return "—";
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  const occupancyBadge =
    occupancy === "occupied"
      ? {
          text: "Occupied",
          cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        }
      : {
          text: "Vacant",
          cls: "border-red-500/30 bg-red-500/10 text-red-200",
        };

  const historyLeases = useMemo(() => {
    if (!blockingLease) return leases;
    return leases.filter((l) => l.id !== blockingLease.id);
  }, [leases, blockingLease]);

  const showHistory = historyLeases.length > 0;

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">
                Unit #{unitIdNumber}
              </h1>
              <p className="text-sm text-neutral-400">Org: {orgSlug}</p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${occupancyBadge.cls}`}
                title="Computed from lease status + dates"
              >
                {occupancyBadge.text}
              </span>

              {!leasesQuery.isLoading && !leasesQuery.error ? (
                <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  Leases: {leases.length}
                </span>
              ) : null}

              {(leasesQuery.isFetching || leasesQuery.isLoading) && (
                <span className="text-xs text-neutral-400">Updating…</span>
              )}
            </div>
          </div>
        </div>

        {/* Current Lease Summary */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Current lease</h2>
              <p className="mt-1 text-xs text-neutral-400">
                Deterministic: active + in date range ({todayISO})
              </p>
            </div>

            {blockingLease ? (
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                Lease #{blockingLease.id}
              </span>
            ) : (
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-400">
                None
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="text-xs text-neutral-400">Rent</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {blockingLease ? formatMoney(blockingLease.rent_amount) : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="text-xs text-neutral-400">Due day</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {blockingLease ? blockingLease.rent_due_day : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="text-xs text-neutral-400">Ends</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {blockingLease ? blockingLease.end_date ?? "Open-ended" : "—"}
              </div>
            </div>
          </div>

          {/* ✅ New Code: render edit-capable LeaseCard right here */}
          {blockingLease ? (
            <div className="mt-4">
              <LeaseCard
                lease={blockingLease}
                orgSlug={orgSlug}
                unitId={unitIdNumber}
                compact
              />
            </div>
          ) : null}

          {!blockingLease ? (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
              This unit is currently vacant. Create an{" "}
              <span className="text-neutral-200">active</span> lease to mark it
              as occupied.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
              A current lease exists. Edit it above. To create a new lease later,
              set the current lease to{" "}
              <span className="text-neutral-200">ended</span>.
            </div>
          )}
        </div>

        {/* Create Lease (ONLY if allowed) */}
        {canCreateNewLease ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <CreateLeaseForm unitId={unitIdNumber} />
          </div>
        ) : null}

        {/* Lease History */}
        {showHistory ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <LeasesList
              leases={historyLeases}
              isLoading={leasesQuery.isLoading}
              isFetching={leasesQuery.isFetching}
              error={leasesQuery.error}
              orgSlug={orgSlug}
              unitId={unitIdNumber}
              title="Lease history"
              emptyMessage="No historical leases yet."
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-400">
            {blockingLease
              ? "No lease history yet."
              : "No leases yet. Create one to mark the unit as occupied."}
          </div>
        )}
      </div>
    </div>
  );
}