// # Filename: src/features/leases/utils/leaseParty.ts


import type { Lease, PrimaryLeasePartyDetail } from "../api/types";

/**
 * getPrimaryLeaseParty
 *
 * Returns the authoritative primary lease party from the backend read model.
 *
 * @param lease Lease resource
 * @returns Primary lease party or null when missing
 */
export function getPrimaryLeaseParty(
  lease: Lease
): PrimaryLeasePartyDetail | null {
  // Step 1: Find the authoritative primary tenant relation
  const primaryParty = lease.parties_detail.find(
    (party): party is PrimaryLeasePartyDetail => party.role === "primary"
  );

  // Step 2: Return null for invalid legacy leases with no primary tenant
  return primaryParty ?? null;
}

/**
 * hasPrimaryLeaseParty
 *
 * Returns true when the lease has a valid primary tenant relationship.
 *
 * @param lease Lease resource
 * @returns Boolean validity flag
 */
export function hasPrimaryLeaseParty(lease: Lease): boolean {
  // Step 1: Reuse the canonical primary-party lookup
  return getPrimaryLeaseParty(lease) !== null;
}

/**
 * requiresPrimaryTenantRepair
 *
 * Returns true when the lease is legacy-invalid and must be repaired
 * before a safe update can be submitted.
 *
 * @param lease Lease resource
 * @returns Boolean repair flag
 */
export function requiresPrimaryTenantRepair(lease: Lease): boolean {
  // Step 1: A lease requires repair when no primary tenant exists
  return !hasPrimaryLeaseParty(lease);
}

/**
 * getPrimaryTenantId
 *
 * Returns the authoritative primary tenant id for the lease.
 *
 * @param lease Lease resource
 * @returns Tenant id or null when missing
 */
export function getPrimaryTenantId(lease: Lease): number | null {
  // Step 1: Resolve the primary lease party
  const primaryParty = getPrimaryLeaseParty(lease);

  // Step 2: Return the tenant id if present
  return primaryParty?.tenant.id ?? null;
}

/**
 * getPrimaryTenantDisplayName
 *
 * Returns the authoritative primary tenant display name.
 *
 * @param lease Lease resource
 * @returns Full name or fallback label
 */
export function getPrimaryTenantDisplayName(lease: Lease): string {
  // Step 1: Resolve the primary tenant
  const primaryParty = getPrimaryLeaseParty(lease);

  // Step 2: Return a safe display fallback for invalid legacy records
  return primaryParty?.tenant.full_name ?? "Missing primary tenant";
}

/**
 * isSamePrimaryTenant
 *
 * Compares a selected tenant id against the current authoritative primary tenant.
 *
 * @param lease Lease resource
 * @param selectedTenantId Candidate tenant id
 * @returns True when unchanged
 */
export function isSamePrimaryTenant(
  lease: Lease,
  selectedTenantId: number | null | undefined
): boolean {
  // Step 1: Resolve the current authoritative tenant id
  const currentTenantId = getPrimaryTenantId(lease);

  // Step 2: Compare against the selected tenant id
  return currentTenantId !== null && currentTenantId === selectedTenantId;
}