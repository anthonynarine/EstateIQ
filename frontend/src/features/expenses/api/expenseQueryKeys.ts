// # Filename: src/features/expenses/api/expenseQueryKeys.ts

// ✅ New Code

import type { ExpenseListFilters, EntityId } from "./expensesTypes";

/**
 * Normalized primitive value allowed inside a query key payload.
 */
type QueryKeyPrimitive = string | number | boolean | null;

/**
 * Stable filter payload shape used inside TanStack Query keys.
 *
 * We normalize filters before placing them into query keys so:
 * - undefined values do not create noisy cache splits
 * - empty strings do not create accidental duplicate queries
 * - object ordering remains predictable
 */
export type NormalizedExpenseFilterKey = Record<string, QueryKeyPrimitive>;

/**
 * Converts raw expense list filters into a stable query-key-safe object.
 *
 * @param filters Raw UI filter state.
 * @returns A normalized object suitable for use in TanStack Query keys.
 */
export function normalizeExpenseFilters(
  filters?: ExpenseListFilters,
): NormalizedExpenseFilterKey {
  // # Step 1: Return an empty object when no filters are provided.
  if (!filters) {
    return {};
  }

  // # Step 2: Sort entries so the resulting object shape is predictable.
  const sortedEntries = Object.entries(filters).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  // # Step 3: Remove undefined, null, and empty string values so they do not
  // create unnecessary cache fragmentation.
  const normalizedEntries = sortedEntries.filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "string" && value.trim() === "") {
      return false;
    }

    return true;
  });

  // # Step 4: Rebuild a clean object for the final key payload.
  return Object.fromEntries(
    normalizedEntries,
  ) as NormalizedExpenseFilterKey;
}

/**
 * Centralized TanStack Query keys for the Expenses feature.
 *
 * Keep all query keys in one place so:
 * - invalidation stays consistent
 * - nested slices remain predictable
 * - future refactors do not require hunting through hooks/components
 */
export const expenseQueryKeys = {
  all: ["expenses"] as const,

  lists: () => [...expenseQueryKeys.all, "list"] as const,
  list: (filters?: ExpenseListFilters) =>
    [...expenseQueryKeys.lists(), normalizeExpenseFilters(filters)] as const,

  details: () => [...expenseQueryKeys.all, "detail"] as const,
  detail: (expenseId: EntityId) =>
    [...expenseQueryKeys.details(), expenseId] as const,

  lookups: () => [...expenseQueryKeys.all, "lookups"] as const,
  categories: () => [...expenseQueryKeys.lookups(), "categories"] as const,
  vendors: () => [...expenseQueryKeys.lookups(), "vendors"] as const,

  reporting: () => [...expenseQueryKeys.all, "reporting"] as const,
  dashboard: (filters?: ExpenseListFilters) =>
    [
      ...expenseQueryKeys.reporting(),
      "dashboard",
      normalizeExpenseFilters(filters),
    ] as const,
  monthlyTrend: (filters?: ExpenseListFilters) =>
    [
      ...expenseQueryKeys.reporting(),
      "monthly-trend",
      normalizeExpenseFilters(filters),
    ] as const,
  byCategory: (filters?: ExpenseListFilters) =>
    [
      ...expenseQueryKeys.reporting(),
      "by-category",
      normalizeExpenseFilters(filters),
    ] as const,
  byBuilding: (filters?: ExpenseListFilters) =>
    [
      ...expenseQueryKeys.reporting(),
      "by-building",
      normalizeExpenseFilters(filters),
    ] as const,
  byUnit: (filters?: ExpenseListFilters) =>
    [
      ...expenseQueryKeys.reporting(),
      "by-unit",
      normalizeExpenseFilters(filters),
    ] as const,
} as const;