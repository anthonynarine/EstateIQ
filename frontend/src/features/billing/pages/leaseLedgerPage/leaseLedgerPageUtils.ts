// # Filename: src/features/billing/pages/leaseLedgerPage/leaseLedgerPageUtils.ts


import type {
  BillingApiErrorShape,
  BillingId,
  LeaseLedgerContext,
} from "../../api/types";

/**
 * MaybeRecord
 *
 * Lightweight object-like type guard target used when narrowing unknown
 * values from flexible ledger payload shapes.
 */
type MaybeRecord = Record<string, unknown>;

/**
 * normalizeLeaseId
 *
 * Normalizes the raw route lease id into a query-safe billing identifier.
 *
 * Responsibilities:
 * - trim route input
 * - guard empty values
 * - return a stable lease id or null
 *
 * @param leaseId Raw lease id from the route.
 * @returns A normalized lease id or null when invalid.
 */
export function normalizeLeaseId(leaseId?: string): BillingId | null {
  // Step 1: Normalize the raw route value.
  const normalizedValue = leaseId?.trim();

  // Step 2: Guard invalid route state.
  if (!normalizedValue) {
    return null;
  }

  // Step 3: Return a stable billing identifier.
  return normalizedValue;
}

/**
 * getQueryErrorMessage
 *
 * Extracts a display-safe message from a lease-ledger query error.
 *
 * Responsibilities:
 * - prefer standard JavaScript Error messages
 * - read backend billing API error envelopes when available
 * - provide a safe fallback when error shape is unknown
 *
 * @param error Unknown query error.
 * @returns A user-facing query error message.
 */
export function getQueryErrorMessage(error: unknown): string {
  // Step 1: Guard empty error values.
  if (!error) {
    return "Unable to load the lease ledger.";
  }

  // Step 2: Prefer native Error messages when available.
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  // Step 3: Fall back to billing API envelope shapes.
  const apiError = error as BillingApiErrorShape;

  if (apiError.error?.message) {
    return apiError.error.message;
  }

  if (apiError.detail) {
    return apiError.detail;
  }

  if (apiError.message) {
    return apiError.message;
  }

  // Step 4: Return the stable fallback.
  return "Unable to load the lease ledger.";
}

/**
 * isRecord
 *
 * Narrows an unknown value into an object-like record.
 *
 * Responsibilities:
 * - protect nested ledger access
 * - avoid unsafe property reads on unknown values
 *
 * @param value Unknown value.
 * @returns Whether the value is object-like.
 */
export function isRecord(value: unknown): value is MaybeRecord {
  return typeof value === "object" && value !== null;
}

/**
 * getLeaseUnitId
 *
 * Best-effort extraction of a unit id from lease-ledger context.
 *
 * Responsibilities:
 * - support both direct and nested payload shapes
 * - return a string-safe unit id for navigation
 *
 * @param lease Lease-ledger context object.
 * @returns The unit id as a string or null.
 */
export function getLeaseUnitId(
  lease?: LeaseLedgerContext,
): string | null {
  // Step 1: Guard missing or invalid context.
  if (!lease || !isRecord(lease)) {
    return null;
  }

  // Step 2: Prefer a direct unit id when present.
  const directUnitId = lease.unit_id;
  if (typeof directUnitId === "string" || typeof directUnitId === "number") {
    return String(directUnitId);
  }

  // Step 3: Fall back to nested unit summary shape.
  const unitValue = lease.unit;
  if (isRecord(unitValue)) {
    const nestedUnitId = unitValue.id;

    if (
      typeof nestedUnitId === "string" ||
      typeof nestedUnitId === "number"
    ) {
      return String(nestedUnitId);
    }
  }

  // Step 4: Return null when unit context is unavailable.
  return null;
}

/**
 * getBuildingLabel
 *
 * Resolves a safe building label from lease-ledger context.
 *
 * Responsibilities:
 * - return trimmed display text
 * - suppress empty labels
 *
 * @param lease Lease-ledger context object.
 * @returns A building label or null.
 */
export function getBuildingLabel(
  lease?: LeaseLedgerContext,
): string | null {
  if (!lease?.building?.label?.trim()) {
    return null;
  }

  return lease.building.label.trim();
}

/**
 * getUnitLabel
 *
 * Resolves a safe unit label from lease-ledger context.
 *
 * Responsibilities:
 * - return trimmed display text
 * - suppress empty labels
 *
 * @param lease Lease-ledger context object.
 * @returns A unit label or null.
 */
export function getUnitLabel(lease?: LeaseLedgerContext): string | null {
  if (!lease?.unit?.label?.trim()) {
    return null;
  }

  return lease.unit.label.trim();
}

/**
 * buildBreadcrumbText
 *
 * Builds the subtle breadcrumb-style workspace text shown in the header.
 *
 * Responsibilities:
 * - combine building and unit display context
 * - append the current workspace label
 * - return null when no useful breadcrumb can be built
 *
 * @param lease Lease-ledger context object.
 * @returns Breadcrumb display text or null.
 */
export function buildBreadcrumbText(
  lease?: LeaseLedgerContext,
): string | null {
  // Step 1: Resolve available display labels.
  const buildingLabel = getBuildingLabel(lease);
  const unitLabel = getUnitLabel(lease);

  // Step 2: Assemble ordered breadcrumb segments.
  const segments = [
    buildingLabel,
    unitLabel ? `Unit ${unitLabel}` : null,
    "Lease Billing",
  ].filter(Boolean) as string[];

  // Step 3: Guard empty breadcrumb state.
  if (!segments.length) {
    return null;
  }

  // Step 4: Return the joined breadcrumb.
  return segments.join(" / ");
}