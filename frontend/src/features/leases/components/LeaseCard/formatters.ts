// # Filename: src/features/leases/components/LeaseCard/formatters.ts
// ✅ New Code

import type { LeaseStatus } from "../../api/types";

/**
 * Formats a numeric money value for display.
 *
 * @param value Raw numeric string or nullable value
 * @returns Formatted currency string without the dollar sign
 */
export function formatMoney(value: string | null | undefined): string {
  // Step 1: Convert the raw value into a number
  const numericValue = Number(value);

  // Step 2: Fall back safely when the value is not numeric
  if (!Number.isFinite(numericValue)) {
    return value ?? "—";
  }

  // Step 3: Return a normalized US number format
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Formats a lease date range for display.
 *
 * @param start Lease start date
 * @param end Lease end date
 * @returns Human-readable lease range
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  // Step 1: Normalize the start label
  const startLabel = start || "—";

  // Step 2: Normalize the end label
  const endLabel = end ? end : "Open-ended";

  // Step 3: Return the final range string
  return `${startLabel} → ${endLabel}`;
}

/**
 * Returns the visual status label for a lease.
 *
 * @param status Lease status
 * @returns User-facing status copy
 */
export function getStatusCopy(status: LeaseStatus): string {
  // Step 1: Map active status
  if (status === "active") {
    return "Active";
  }

  // Step 2: Map draft status
  if (status === "draft") {
    return "Draft";
  }

  // Step 3: Default to ended status
  return "Ended";
}

/**
 * Returns the Tailwind classes for the lease status pill.
 *
 * @param status Lease status
 * @returns Tailwind class string
 */
export function getStatusPillClasses(status: LeaseStatus): string {
  // Step 1: Active lease styling
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  // Step 2: Draft lease styling
  if (status === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  // Step 3: Ended lease styling
  return "border-neutral-500/30 bg-neutral-500/10 text-neutral-300";
}