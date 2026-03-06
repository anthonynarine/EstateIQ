// # Filename: src/features/leases/pages/UnitLeaseDetailPage.tsx

import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

import { useOrg } from "../../tenancy/hooks/useOrg";
import { useUnitDetailQuery } from "../../buildings/pages/BuildingPage/hooks/useUnitDetailQuery";
import UnitLeaseHeader from "../components/UnitLeaseHeader";
import CurrentLeasePanel from "../components/CurrentLeasePanel";
import LeaseHistorySection from "../components/LeaseHistorySection";
import { useLeasesByUnitQuery } from "../queries/useLeasesByUnitQuery";
import {
  getCurrentLease,
  getTodayISO,
  getUnitOccupancyStatus,
} from "../utils/occupancy";

type BuildingNavState = {
  building?: {
    id?: number;
    name?: string;
    address_line1?: string;
    address_line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  unit?: {
    id?: number;
    label?: string;
  };
};

/**
 * UnitLeaseDetailPage
 *
 * Lease workspace for a single unit.
 *
 * Responsibilities:
 * - Resolve route params and org context
 * - Fetch deterministic unit identity
 * - Fetch lease workspace data
 * - Derive current lease / draft lease / history / occupancy
 * - Pass clean props into presentational sections
 */
export default function UnitLeaseDetailPage() {
  // Step 1: Resolve params + org + nav state
  const { unitId } = useParams<{ unitId: string }>();
  const { orgSlug } = useOrg();
  const location = useLocation();

  const navState = (location.state as BuildingNavState | null) ?? null;

  // Step 2: Parse / validate unitId
  const unitIdNumber = useMemo(() => {
    if (!unitId) return null;

    const parsed = Number(unitId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [unitId]);

  // Step 3: Stable fallback values for hook-safe execution
  const safeOrgSlug = orgSlug ?? "";
  const safeUnitId = unitIdNumber ?? 0;
  const canRunQueries = Boolean(orgSlug) && typeof unitIdNumber === "number";

  // Step 4: Queries
  const unitQuery = useUnitDetailQuery(safeOrgSlug, safeUnitId);

  const leasesQuery = useLeasesByUnitQuery({
    orgSlug: safeOrgSlug,
    unitId: safeUnitId,
    enabled: canRunQueries,
  });

  // Step 5: Lease-derived workspace state
  const todayISO = useMemo(() => getTodayISO(), []);
  const leases = leasesQuery.data ?? [];

  const occupancy = useMemo(() => {
    return getUnitOccupancyStatus(leases, todayISO);
  }, [leases, todayISO]);

  const currentLease = useMemo(() => {
    return getCurrentLease(leases, todayISO);
  }, [leases, todayISO]);

  const draftLease = useMemo(() => {
    return leases.find((lease) => lease.status === "draft") ?? null;
  }, [leases]);

  const blockingLease = currentLease ?? draftLease;
  const canCreateNewLease = !blockingLease;

  // Step 6: Deterministic identity for header + back navigation
  const buildingId =
    unitQuery.data?.building?.id ??
    navState?.building?.id ??
    null;

  const buildingName =
    unitQuery.data?.building?.name ??
    navState?.building?.name ??
    "Building";

  const unitLabel =
    unitQuery.data?.label ??
    navState?.unit?.label ??
    String(unitIdNumber ?? "");

  const backToUnitsHref = buildingId
    ? `/dashboard/buildings/${buildingId}${location.search || ""}`
    : null;

  // Step 7: Display helpers
  const formatMoney = (raw: string | null | undefined) => {
    if (!raw) return "—";

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return raw;

    return parsed.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
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

    return leases.filter((lease) => lease.id !== blockingLease.id);
  }, [leases, blockingLease]);

  const unitLeaseCount = leases.length;

  // Step 8: Guards
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

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <UnitLeaseHeader
          buildingName={buildingName}
          unitLabel={unitLabel}
          backToUnitsHref={backToUnitsHref}
          occupancyText={occupancyBadge.text}
          occupancyClassName={occupancyBadge.cls}
          unitLeaseCount={unitLeaseCount}
          isLoadingLeaseCount={leasesQuery.isLoading}
          isRefreshing={leasesQuery.isFetching || unitQuery.isFetching}
          orgSlug={orgSlug}
        />

        <CurrentLeasePanel
          todayISO={todayISO}
          currentLease={currentLease}
          draftLease={draftLease}
          blockingLease={blockingLease}
          canCreateNewLease={canCreateNewLease}
          isLoading={leasesQuery.isLoading}
          error={leasesQuery.error}
          unitId={unitIdNumber}
          orgSlug={orgSlug}
          formatMoney={formatMoney}
        />

        <LeaseHistorySection
          leases={historyLeases}
          isLoading={leasesQuery.isLoading}
          isFetching={leasesQuery.isFetching}
          error={leasesQuery.error}
          orgSlug={orgSlug}
          unitId={unitIdNumber}
          title="Lease history"
          emptyMessage="No lease history yet."
        />
      </div>
    </div>
  );
}