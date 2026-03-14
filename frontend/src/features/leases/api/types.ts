// # Filename: src/features/leases/api/types.ts


/**
 * Lease status values supported by the backend.
 */
export type LeaseStatus = "draft" | "active" | "ended";

/**
 * Lease party role values supported by the backend.
 *
 * Important:
 * Keep this aligned with the Django LeaseTenant.Role choices.
 */
export type LeasePartyRole = "primary" | "co_tenant" | "occupant";

/**
 * Lightweight tenant shape returned inside lease party detail responses.
 */
export interface LeaseTenantSummary {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Read shape returned by the backend for lease party details.
 */
export interface LeasePartyDetail {
  tenant: LeaseTenantSummary;
  role: LeasePartyRole;
}

/**
 * Specialized read shape for the authoritative primary lease party.
 */
export interface PrimaryLeasePartyDetail extends LeasePartyDetail {
  role: "primary";
}

/**
 * Write payload shape for lease parties.
 */
export interface LeasePartyWriteInput {
  tenant_id: number;
  role: LeasePartyRole;
}

/**
 * Canonical lease resource returned from the backend.
 */
export interface Lease {
  id: number;
  unit: number;
  start_date: string;
  end_date: string | null;
  rent_amount: string;
  security_deposit_amount: string | null;
  rent_due_day: number;
  status: LeaseStatus;
  parties_detail: LeasePartyDetail[];
  created_at: string;
  updated_at: string;
}

/**
 * Shared create payload for lease creation.
 *
 * Important:
 * - Backend requires at least one primary tenant in `parties`.
 */
export interface CreateLeaseInput {
  unit: number;
  start_date: string;
  end_date?: string | null;
  rent_amount: string;
  security_deposit_amount?: string | null;
  rent_due_day?: number;
  status?: LeaseStatus;
  parties: LeasePartyWriteInput[];
}

/**
 * Partial patch payload for lease updates.
 *
 * Important:
 * - Omit `parties` when tenant linkage is unchanged.
 * - Include `parties` when changing or repairing the primary tenant link.
 */
export interface UpdateLeaseInput {
  start_date?: string;
  end_date?: string | null;
  rent_amount?: string;
  security_deposit_amount?: string | null;
  rent_due_day?: number;
  status?: LeaseStatus;
  parties?: LeasePartyWriteInput[];
}

/**
 * Shared DRF paginated list response shape.
 */
export interface DRFPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Structured backend service error payload shape.
 */
export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Returns the authoritative primary lease party from parties_detail.
 *
 * This is the only frontend-safe source of truth for the current
 * primary tenant on a lease.
 */
export function getPrimaryLeaseParty(
  lease: Lease
): PrimaryLeasePartyDetail | null {
  // Step 1: Find the first primary lease party from the backend read model
  const primaryParty = lease.parties_detail.find(
    (party): party is PrimaryLeasePartyDetail => party.role === "primary"
  );

  // Step 2: Return the resolved primary party or null for invalid legacy leases
  return primaryParty ?? null;
}

/**
 * Returns true when the lease has an authoritative primary tenant.
 */
export function hasPrimaryLeaseParty(lease: Lease): boolean {
  // Step 1: Reuse the canonical primary party helper
  return getPrimaryLeaseParty(lease) !== null;
}

/**
 * Returns true when the lease is a legacy-invalid record with no primary tenant.
 *
 * The edit flow should force repair before save in this state.
 */
export function requiresPrimaryTenantRepair(lease: Lease): boolean {
  // Step 1: A lease requires repair when no primary party exists
  return !hasPrimaryLeaseParty(lease);
}