// # Filename: src/features/expenses/reporting/utils/reportingPayloadUtils.ts

// ✅ New Code

import type {
  ExpenseDashboardResponse,
  ExpenseDashboardSummaryFields,
} from "../../api/expensesTypes";
import { isRecord } from "./reportingNumberUtils";

/**
 * Extracts a points array from reporting payloads that may use multiple
 * collection keys while the backend contract stabilizes.
 *
 * Supported keys:
 * - points
 * - results
 * - items
 * - data
 *
 * @param payload Reporting payload.
 * @returns Raw points array.
 */
export function getRawPointsArray<
  T extends {
    points?: unknown;
    results?: unknown;
    items?: unknown;
    data?: unknown;
  },
>(payload?: T | null): unknown[] {
  // # Step 1: Prefer `points` when present.
  if (Array.isArray(payload?.points)) {
    return payload.points;
  }

  // # Step 2: Fall back to `results` when present.
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  // # Step 3: Fall back to `items` when present.
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  // # Step 4: Fall back to `data` when present.
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  // # Step 5: Return an empty array for unsupported payloads.
  return [];
}

/**
 * Resolves a dashboard summary source.
 *
 * Strategy:
 * - prefer `summary`
 * - then `totals`
 * - then the root dashboard object
 *
 * @param dashboard Dashboard payload.
 * @returns Best available summary source.
 */
export function getDashboardSummarySource(
  dashboard: ExpenseDashboardResponse,
): ExpenseDashboardSummaryFields {
  // # Step 1: Prefer `summary` when available.
  if (isRecord(dashboard.summary)) {
    return dashboard.summary as ExpenseDashboardSummaryFields;
  }

  // # Step 2: Fall back to `totals` when available.
  if (isRecord(dashboard.totals)) {
    return dashboard.totals as ExpenseDashboardSummaryFields;
  }

  // # Step 3: Fall back to the dashboard root itself.
  return dashboard;
}