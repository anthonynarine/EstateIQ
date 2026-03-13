// # Filename: src/features/leases/api/types.ts

/**
 * Lease status values supported by the backend.
 */
export type LeaseStatus = "draft" | "active" | "ended";

/**
 * Lease party role values supported by the backend.
 *
 * Keep this explicit for now because your backend business rule
 * depends on "primary" existing and being enforced correctly.
 */
export type LeasePartyRole = "primary" | "occupant";

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
 * - Backend now requires at least one primary tenant in `parties`.
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
 * - We now allow `parties` because the backend service supports
 *   primary tenant syncing/repair during PATCH.
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