// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingBuildingTable.tsx

// ✅ New Code

import type { ExpenseByBuildingPoint } from "../../api/expensesTypes";
import { formatCurrency, formatNumber } from "./reportingFormatters";

/**
 * Props for the ReportingBuildingTable component.
 */
interface ReportingBuildingTableProps {
  points: ExpenseByBuildingPoint[];
}

/**
 * ReportingBuildingTable
 *
 * Renders the expense building breakdown as a themed reporting table.
 *
 * Responsibilities:
 * - display normalized building reporting rows
 * - format count and total values consistently
 * - keep building-specific markup out of the reporting wrapper
 *
 * Non-responsibilities:
 * - fetching data
 * - loading/error orchestration
 * - transforming raw API payloads
 *
 * @param props Component props.
 * @returns Building breakdown reporting table.
 */
export default function ReportingBuildingTable({
  points,
}: ReportingBuildingTableProps) {
  // # Step 1: Render themed empty state when no building data exists.
  if (!points.length) {
    return (
      <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Building analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              By building
            </h3>

            <p className="text-sm leading-6 text-neutral-400">
              Compare expense totals across buildings in the current scope.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-5">
            <p className="text-sm text-neutral-400">
              No building breakdown data is available for the current filter
              set.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // # Step 2: Sort points by total descending for clearer comparison.
  const sortedPoints = [...points].sort((left, right) => right.total - left.total);

  // # Step 3: Derive summary values for badges.
  const totalAcrossBuildings = sortedPoints.reduce(
    (runningTotal, point) => runningTotal + point.total,
    0,
  );

  const topBuildingPoint = sortedPoints[0] ?? null;

  // # Step 4: Render the themed building comparison table.
  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Building analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              By building
            </h3>

            <p className="mt-1 text-sm leading-6 text-neutral-400">
              Compare expense totals across buildings in the current scope.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {sortedPoints.length}{" "}
              {sortedPoints.length === 1 ? "building" : "buildings"}
            </span>

            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              Total: {formatCurrency(totalAcrossBuildings)}
            </span>

            {topBuildingPoint ? (
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Top: {topBuildingPoint.building_name ?? "Portfolio / Unassigned"}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h4 className="text-sm font-semibold text-white">
              Building detail
            </h4>
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
                {sortedPoints.map((point, index) => (
                  <tr
                    key={`${
                      point.building_id ?? point.building_name ?? "building"
                    }-${index}`}
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
      </div>
    </section>
  );
}