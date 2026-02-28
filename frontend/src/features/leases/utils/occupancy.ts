// # Filename: src/features/leases/utils/occupancy.ts
// ✅ New Code

import type { Lease } from "../api/leasesApi";

export type OccupancyStatus = "occupied" | "vacant";

/**
 * isLeaseCurrent
 *
 * Deterministic rule for whether a lease is "in effect" on a given date.
 * This is NOT AI. It is pure business logic derived from the lease contract.
 *
 * @param lease - Lease object
 * @param todayISO - Today's date in YYYY-MM-DD (timezone-stable)
 */
export function isLeaseCurrent(lease: Lease, todayISO: string): boolean {
  // Step 1: Active leases only
  if (lease.status !== "active") return false;

  // Step 2: Date checks (ISO date strings compare lexicographically)
  const startsOnOrBefore = lease.start_date <= todayISO;

  const endsOnOrAfter =
    lease.end_date == null ? true : lease.end_date >= todayISO;

  return startsOnOrBefore && endsOnOrAfter;
}

/**
 * getCurrentLease
 *
 * Returns the current active lease for a unit (if any) on a given date.
 * If multiple active leases exist (shouldn't happen due to DB constraint),
 * we pick the one with the latest start_date as a defensive fallback.
 *
 * @param leases - Leases for a unit
 * @param todayISO - Today's date in YYYY-MM-DD
 */
export function getCurrentLease(leases: Lease[], todayISO: string): Lease | null {
  // Step 1: Filter current leases
  const current = (leases ?? []).filter((l) => isLeaseCurrent(l, todayISO));

  if (current.length === 0) return null;

  // Step 2: Defensive sorting (latest start_date wins)
  current.sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  return current[0];
}

/**
 * getUnitOccupancyStatus
 *
 * Computes occupancy status from lease data.
 *
 * @param leases - Leases for a unit
 * @param todayISO - Today's date in YYYY-MM-DD
 */
export function getUnitOccupancyStatus(
  leases: Lease[],
  todayISO: string
): OccupancyStatus {
  return getCurrentLease(leases, todayISO) ? "occupied" : "vacant";
}

/**
 * getTodayISO
 *
 * Produces a timezone-stable ISO date string (YYYY-MM-DD) for "today"
 * using the user's local timezone in the browser.
 */
export function getTodayISO(): string {
  // Step 1: Local date -> YYYY-MM-DD
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}