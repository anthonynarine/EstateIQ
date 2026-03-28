// # Filename: src/features/expenses/reporting/utils/reportingBreakdownSelectors.ts


import type {
  ExpenseByBuildingPoint,
  ExpenseByBuildingResponse,
  ExpenseByCategoryPoint,
  ExpenseByCategoryResponse,
  ExpenseMonthlyTrendPoint,
  ExpenseMonthlyTrendResponse,
} from "../../api/expensesTypes";
import { reportDebug, reportNormalizedPoint } from "./reportingDebug";
import {
  isRecord,
  resolvePointCount,
  resolvePointTotal,
  resolveStringLabel,
} from "./reportingNumberUtils";
import { getRawPointsArray } from "./reportingPayloadUtils";

/**
 * Normalized monthly trend point used by reporting UI components.
 */
export interface ReportingMonthlyTrendPoint {
  month: string;
  total: number;
}

/**
 * Normalized category reporting point used by reporting UI components.
 */
export interface ReportingCategoryPoint {
  category_id?: ExpenseByCategoryPoint["category_id"];
  category_name?: ExpenseByCategoryPoint["category_name"];
  count: number;
  total: number;
}

/**
 * Normalized building reporting point used by reporting UI components.
 */
export interface ReportingBuildingPoint {
  building_id?: ExpenseByBuildingPoint["building_id"];
  building_name?: ExpenseByBuildingPoint["building_name"];
  count: number;
  total: number;
}

/**
 * Extracts monthly trend points from the reporting payload.
 *
 * Supported collection keys:
 * - payload.points
 * - payload.results
 * - payload.items
 * - payload.data
 *
 * Supported value aliases:
 * - month
 * - label
 * - period
 * - total
 * - amount
 * - value
 *
 * @param payload Monthly trend API response.
 * @returns Normalized monthly trend points.
 */
export function getMonthlyTrendPoints(
  payload?: ExpenseMonthlyTrendResponse | null,
): ReportingMonthlyTrendPoint[] {
  // # Step 1: Extract raw points from the payload.
  const rawPoints = getRawPointsArray(payload) as ExpenseMonthlyTrendPoint[];

  reportDebug("monthly trend raw payload", payload);
  reportDebug("monthly trend raw points", rawPoints);

  // # Step 2: Normalize labels and numeric fields for chart-safe usage.
  const normalizedPoints = rawPoints.map((point, index) => {
    const pointRecord = isRecord(point) ? point : {};

    const normalizedPoint: ReportingMonthlyTrendPoint = {
      month: resolveStringLabel(pointRecord, `Point ${index + 1}`, [
        "month",
        "label",
        "period",
      ]),
      total: resolvePointTotal(pointRecord, "monthly trend total"),
    };

    reportNormalizedPoint(
      "monthly trend normalized point",
      point,
      normalizedPoint,
    );

    return normalizedPoint;
  });

  reportDebug("monthly trend normalized points", normalizedPoints);

  return normalizedPoints;
}

/**
 * Extracts category breakdown points from the reporting payload.
 *
 * Supported collection keys:
 * - payload.points
 * - payload.results
 * - payload.items
 * - payload.data
 *
 * Supported aliases:
 * - category_name | label | name
 * - total | amount | value | total_amount | expense_total
 * - count | expense_count | item_count | total_count
 *
 * @param payload Category breakdown API response.
 * @returns Normalized category breakdown points.
 */
export function getCategoryPoints(
  payload?: ExpenseByCategoryResponse | null,
): ReportingCategoryPoint[] {
  // # Step 1: Extract raw points from the payload.
  const rawPoints = getRawPointsArray(payload) as ExpenseByCategoryPoint[];

  reportDebug("category raw payload", payload);
  reportDebug("category raw points", rawPoints);

  // # Step 2: Normalize category rows for chart-safe usage.
  const normalizedPoints = rawPoints.map((point, index) => {
    const pointRecord = isRecord(point) ? point : {};

    const normalizedPoint: ReportingCategoryPoint = {
      category_id: point.category_id,
      category_name: resolveStringLabel(pointRecord, `Category ${index + 1}`, [
        "category_name",
        "label",
        "name",
      ]),
      count: resolvePointCount(pointRecord, "category count"),
      total: resolvePointTotal(pointRecord, "category total"),
    };

    reportNormalizedPoint("category normalized point", point, normalizedPoint);

    return normalizedPoint;
  });

  reportDebug("category normalized points", normalizedPoints);

  return normalizedPoints;
}

/**
 * Extracts building breakdown points from the reporting payload.
 *
 * Supported collection keys:
 * - payload.points
 * - payload.results
 * - payload.items
 * - payload.data
 *
 * Supported aliases:
 * - building_name | label | name
 * - total | amount | value | total_amount | expense_total
 * - count | expense_count | item_count | total_count
 *
 * @param payload Building breakdown API response.
 * @returns Normalized building breakdown points.
 */
export function getBuildingPoints(
  payload?: ExpenseByBuildingResponse | null,
): ReportingBuildingPoint[] {
  // # Step 1: Extract raw points from the payload.
  const rawPoints = getRawPointsArray(payload) as ExpenseByBuildingPoint[];

  reportDebug("building raw payload", payload);
  reportDebug("building raw points", rawPoints);

  // # Step 2: Normalize building rows for chart-safe usage.
  const normalizedPoints = rawPoints.map((point, index) => {
    const pointRecord = isRecord(point) ? point : {};

    const normalizedPoint: ReportingBuildingPoint = {
      building_id: point.building_id,
      building_name: resolveStringLabel(pointRecord, `Building ${index + 1}`, [
        "building_name",
        "label",
        "name",
      ]),
      count: resolvePointCount(pointRecord, "building count"),
      total: resolvePointTotal(pointRecord, "building total"),
    };

    reportNormalizedPoint("building normalized point", point, normalizedPoint);

    return normalizedPoint;
  });

  reportDebug("building normalized points", normalizedPoints);

  return normalizedPoints;
}