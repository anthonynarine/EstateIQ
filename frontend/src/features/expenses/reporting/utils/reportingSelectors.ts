// # Filename: src/features/expenses/reporting/reportingSelectors.ts

// ✅ New Code

/**
 * Public reporting selector surface for the expenses reporting workspace.
 *
 * This module exists as a compatibility bridge during the selector refactor.
 * Existing consumers can continue importing from `reportingSelectors` while
 * the implementation is split into smaller, responsibility-focused modules.
 *
 * Responsibilities exposed here:
 * - dashboard metric normalization
 * - monthly trend normalization
 * - category breakdown normalization
 * - building breakdown normalization
 * - money-metric detection for UI formatting
 */

/**
 * Re-exported normalized dashboard metric type used by reporting KPI UI.
 */
export type { ReportingDashboardMetric } from "../utils/reportingDashboardSelectors";

/**
 * Re-exported dashboard selector helpers.
 *
 * - `getDashboardMetrics` extracts normalized KPI cards
 * - `isMoneyMetric` identifies currency-like metrics for formatting
 * - `normalizeDashboardMetric` converts raw API metrics into UI-safe values
 */
export {
  getDashboardMetrics,
  isMoneyMetric,
  normalizeDashboardMetric,
} from "../utils/reportingDashboardSelectors";

/**
 * Re-exported normalized breakdown point types used by reporting tables
 * and charts.
 */
export type {
  ReportingBuildingPoint,
  ReportingCategoryPoint,
  ReportingMonthlyTrendPoint,
} from "../utils/reportingBreakdownSelectors";

/**
 * Re-exported breakdown selector helpers.
 *
 * - `getBuildingPoints` normalizes building reporting rows
 * - `getCategoryPoints` normalizes category reporting rows
 * - `getMonthlyTrendPoints` normalizes monthly trend chart points
 */
export {
  getBuildingPoints,
  getCategoryPoints,
  getMonthlyTrendPoints,
} from "../utils/reportingBreakdownSelectors";