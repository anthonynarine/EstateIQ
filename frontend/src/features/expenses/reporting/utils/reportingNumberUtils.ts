// # Filename: src/features/expenses/reporting/utils/reportingNumberUtils.ts

// ✅ New Code

import {
  reportResolvedField,
} from "./reportingDebug";

/**
 * Generic unknown object record used for safe payload inspection.
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Supported aliases for total-like numeric fields.
 */
const TOTAL_FIELD_CANDIDATES = [
  "total",
  "amount",
  "value",
  "total_amount",
  "expense_total",
] as const;

/**
 * Supported aliases for count-like numeric fields.
 */
const COUNT_FIELD_CANDIDATES = [
  "count",
  "expense_count",
  "item_count",
  "total_count",
] as const;

/**
 * Determines whether a value is a plain object-like record.
 *
 * @param value Unknown value.
 * @returns True when the value is a non-null object and not an array.
 */
export function isRecord(value: unknown): value is UnknownRecord {
  // # Step 1: Accept only non-null objects that are not arrays.
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Safely converts reporting scalar-like values into numbers for chart math.
 *
 * Supports:
 * - numbers
 * - numeric strings
 * - strings with commas or dollar signs
 *
 * @param value Raw reporting scalar.
 * @returns Safe numeric value.
 */
export function toSafeNumber(value: unknown): number {
  // # Step 1: Handle native numeric values.
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  // # Step 2: Handle numeric strings from API payloads.
  if (typeof value === "string") {
    const normalizedValue = value
      .trim()
      .replace(/,/g, "")
      .replace(/\$/g, "");

    if (!normalizedValue) {
      return 0;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  // # Step 3: Fall back safely for nullish or unsupported values.
  return 0;
}

/**
 * Returns the first defined value from a list of candidate keys.
 *
 * @param source Source object.
 * @param keys Candidate keys in priority order.
 * @returns First defined value, or undefined.
 */
export function getFirstDefinedValue(
  source: UnknownRecord,
  keys: readonly string[],
): unknown | undefined {
  // # Step 1: Return the first defined candidate.
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  // # Step 2: Fall back when no key matches.
  return undefined;
}

/**
 * Returns the first resolved field key from a list of candidate keys.
 *
 * @param source Source object.
 * @param keys Candidate keys in priority order.
 * @returns Matched key, or null when no key resolves.
 */
export function getFirstDefinedKey(
  source: UnknownRecord,
  keys: readonly string[],
): string | null {
  // # Step 1: Return the first key whose value is defined.
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return key;
    }
  }

  // # Step 2: Fall back when no key matches.
  return null;
}

/**
 * Resolves a string label from a point using a list of fallback keys.
 *
 * @param point Raw point record.
 * @param fallback Fallback label when no key resolves.
 * @param keys Candidate string keys.
 * @returns Safe string label.
 */
export function resolveStringLabel(
  point: UnknownRecord,
  fallback: string,
  keys: readonly string[],
): string {
  // # Step 1: Read the first available string-like value.
  const rawValue = getFirstDefinedValue(point, keys);

  // # Step 2: Return a trimmed string when possible.
  if (typeof rawValue === "string" && rawValue.trim()) {
    return rawValue.trim();
  }

  // # Step 3: Fall back safely.
  return fallback;
}

/**
 * Resolves a numeric reporting total from a point.
 *
 * Supported aliases:
 * - total
 * - amount
 * - value
 * - total_amount
 * - expense_total
 *
 * @param point Raw reporting point.
 * @param label Optional debug label.
 * @returns Safe numeric total.
 */
export function resolvePointTotal(
  point: UnknownRecord,
  label = "resolvePointTotal",
): number {
  // # Step 1: Resolve the first available total-like key.
  const resolvedKey = getFirstDefinedKey(point, TOTAL_FIELD_CANDIDATES);
  const rawTotal =
    resolvedKey === null ? undefined : point[resolvedKey];

  // # Step 2: Emit contract diagnostics.
  reportResolvedField(
    label,
    [...TOTAL_FIELD_CANDIDATES],
    resolvedKey,
    rawTotal,
    point,
  );

  // # Step 3: Convert to a safe numeric value.
  return toSafeNumber(rawTotal);
}

/**
 * Resolves a numeric reporting count from a point.
 *
 * Supported aliases:
 * - count
 * - expense_count
 * - item_count
 * - total_count
 *
 * @param point Raw reporting point.
 * @param label Optional debug label.
 * @returns Safe numeric count.
 */
export function resolvePointCount(
  point: UnknownRecord,
  label = "resolvePointCount",
): number {
  // # Step 1: Resolve the first available count-like key.
  const resolvedKey = getFirstDefinedKey(point, COUNT_FIELD_CANDIDATES);
  const rawCount =
    resolvedKey === null ? undefined : point[resolvedKey];

  // # Step 2: Emit contract diagnostics.
  reportResolvedField(
    label,
    [...COUNT_FIELD_CANDIDATES],
    resolvedKey,
    rawCount,
    point,
  );

  // # Step 3: Convert to a safe numeric value.
  return toSafeNumber(rawCount);
}