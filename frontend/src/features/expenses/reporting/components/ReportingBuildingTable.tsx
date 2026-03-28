// # Filename: src/features/expenses/reporting/components/ReportingBuildingTable.tsx


import { useMemo, useState } from "react";

import type { ReportingBuildingPoint } from "../utils/reportingSelectors";
import { formatCurrency, formatNumber } from "../utils/reportingFormatters";

/**
 * Props for the ReportingBuildingTable component.
 */
interface ReportingBuildingTableProps {
  points: ReportingBuildingPoint[];
}

interface BuildingBarRowProps {
  buildingName: string;
  total: number;
  maxTotal: number;
  totalAcrossBuildings: number;
}

/**
 * Returns a safe percent share across all building totals.
 *
 * @param total Building total.
 * @param totalAcrossBuildings Sum of all building totals.
 * @returns Rounded whole-number percentage.
 */
function getSharePercentage(
  total: number,
  totalAcrossBuildings: number,
): number {
  // # Step 1: Guard against divide-by-zero for empty datasets.
  if (totalAcrossBuildings <= 0) {
    return 0;
  }

  // # Step 2: Compute and round the building share.
  return Math.round((total / totalAcrossBuildings) * 100);
}

/**
 * Renders a single building distribution row with a horizontal bar.
 *
 * @param props Component props.
 * @returns A themed building comparison row.
 */
function BuildingBarRow({
  buildingName,
  total,
  maxTotal,
  totalAcrossBuildings,
}: BuildingBarRowProps) {
  // # Step 1: Calculate a safe proportional width for the chart bar.
  const rawWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const widthPercentage = Math.max(rawWidth, total > 0 ? 6 : 0);

  // # Step 2: Compute share label for compact comparison.
  const sharePercentage = getSharePercentage(total, totalAcrossBuildings);

  return (
    <div className="grid grid-cols-[minmax(0,170px)_minmax(0,1fr)_72px_110px] items-center gap-3">
      <div className="truncate text-sm font-medium text-neutral-300">
        {buildingName}
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-neutral-900">
        <div
          className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
          style={{ width: `${Math.min(widthPercentage, 100)}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="text-right text-xs font-medium text-neutral-400">
        {sharePercentage}%
      </div>

      <div className="text-right text-sm font-medium text-white">
        {formatCurrency(total)}
      </div>
    </div>
  );
}

/**
 * ReportingBuildingTable
 *
 * Lightweight building comparison surface for the reporting workspace.
 *
 * Responsibilities:
 * - render the active building comparison view
 * - keep the UI chart-first and compact
 * - hide exact detail rows behind a toggle
 *
 * Non-responsibilities:
 * - fetching reporting data
 * - parent layout orchestration
 * - transforming raw API payloads
 *
 * @param props Component props.
 * @returns Building comparison content.
 */
export default function ReportingBuildingTable({
  points,
}: ReportingBuildingTableProps) {
  // # Step 1: Track whether exact detail rows are expanded.
  const [showDetails, setShowDetails] = useState(false);

  // # Step 2: Sort and summarize normalized building points once.
  const summary = useMemo(() => {
    const sortedPoints = [...points].sort(
      (left, right) => right.total - left.total,
    );

    const totalAcrossBuildings = sortedPoints.reduce(
      (runningTotal, point) => runningTotal + point.total,
      0,
    );

    const maxTotal = Math.max(
      ...sortedPoints.map((point) => point.total),
      0,
    );

    const topBuildingPoint = sortedPoints[0] ?? null;

    return {
      sortedPoints,
      totalAcrossBuildings,
      maxTotal,
      topBuildingPoint,
    };
  }, [points]);

  // # Step 3: Render a lightweight empty state when no building data exists.
  if (!summary.sortedPoints.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 px-4 py-5">
        <p className="text-sm text-neutral-400">
          No building comparison data is available for the current filter set.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Building view
          </p>

          <h4 className="text-lg font-semibold tracking-tight text-white">
            By building
          </h4>

          <p className="mt-1 text-sm leading-6 text-neutral-400">
            Compare how spend is distributed across the active buildings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
            {summary.sortedPoints.length}{" "}
            {summary.sortedPoints.length === 1 ? "building" : "buildings"}
          </span>

          <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
            Total: {formatCurrency(summary.totalAcrossBuildings)}
          </span>

          {summary.topBuildingPoint ? (
            <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              Top:{" "}
              {summary.topBuildingPoint.building_name ??
                "Portfolio / Unassigned"}
            </span>
          ) : null}
        </div>
      </div>

      <section
        aria-label="Expense building distribution chart"
        className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h5 className="text-sm font-semibold text-white">
              Distribution overview
            </h5>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Relative spend concentration across the selected buildings.
            </p>
          </div>

          <span className="inline-flex self-start rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
            Max building: {formatCurrency(summary.maxTotal)}
          </span>
        </div>

        <div className="space-y-3">
          {summary.sortedPoints.map((point, index) => (
            <BuildingBarRow
              key={`${point.building_id ?? point.building_name ?? "building"}-${index}`}
              buildingName={point.building_name ?? "Portfolio / Unassigned"}
              total={point.total}
              maxTotal={summary.maxTotal}
              totalAcrossBuildings={summary.totalAcrossBuildings}
            />
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-800 pt-1">
        <div className="text-xs text-neutral-500">
          Exact building totals are available on demand.
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((currentValue) => !currentValue)}
          aria-expanded={showDetails}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
        >
          <span>{showDetails ? "Hide details" : "Show details"}</span>

          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 transition-transform ${
              showDetails ? "rotate-180" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showDetails ? (
        <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h5 className="text-sm font-semibold text-white">
              Building detail
            </h5>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-neutral-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Building
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Count
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {summary.sortedPoints.map((point, index) => (
                  <tr
                    key={`${point.building_id ?? point.building_name ?? "building"}-row-${index}`}
                    className="transition-colors hover:bg-neutral-900/60"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                      {point.building_name ?? "Portfolio / Unassigned"}
                    </td>

                    <td className="px-4 py-3 text-right text-sm text-neutral-300">
                      {formatNumber(point.count)}
                    </td>

                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      {formatCurrency(point.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}