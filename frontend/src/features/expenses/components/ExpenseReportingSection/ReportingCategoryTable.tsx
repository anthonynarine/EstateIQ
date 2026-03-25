// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingCategoryTable.tsx

// ✅ New Code

import type { ExpenseByCategoryPoint } from "../../api/expensesTypes";
import { formatCurrency, formatNumber } from "./reportingFormatters";

/**
 * Props for the ReportingCategoryTable component.
 */
interface ReportingCategoryTableProps {
  points: ExpenseByCategoryPoint[];
}

interface CategoryBarRowProps {
  categoryName: string;
  count: number;
  total: number;
  maxTotal: number;
  totalAcrossCategories: number;
}

/**
 * Returns a safe percent share across all category totals.
 *
 * @param total Category total.
 * @param totalAcrossCategories Sum of all category totals.
 * @returns Rounded whole-number percentage.
 */
function getSharePercentage(
  total: number,
  totalAcrossCategories: number,
): number {
  // # Step 1: Guard against divide-by-zero for empty datasets.
  if (totalAcrossCategories <= 0) {
    return 0;
  }

  // # Step 2: Compute and round the category share.
  return Math.round((total / totalAcrossCategories) * 100);
}

/**
 * Renders a single category distribution row with a horizontal bar.
 *
 * @param props Component props.
 * @returns A themed category chart row.
 */
function CategoryBarRow({
  categoryName,
  count,
  total,
  maxTotal,
  totalAcrossCategories,
}: CategoryBarRowProps) {
  // # Step 1: Calculate a safe proportional width for the chart bar.
  const rawWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const widthPercentage = Math.max(rawWidth, total > 0 ? 6 : 0);

  // # Step 2: Compute share label for compact comparison.
  const sharePercentage = getSharePercentage(total, totalAcrossCategories);

  return (
    <div className="grid grid-cols-[minmax(0,164px)_minmax(0,1fr)_84px_112px] items-center gap-3">
      <div className="truncate text-sm font-medium text-neutral-300">
        {categoryName}
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
 * ReportingCategoryTable
 *
 * Renders category expense reporting as a themed reporting card with:
 * - reporting header
 * - horizontal category distribution chart
 * - trustworthy detail table
 *
 * Responsibilities:
 * - display normalized category reporting rows
 * - format count and total values consistently
 * - surface category spend distribution visually
 *
 * Non-responsibilities:
 * - fetching data
 * - loading/error orchestration
 * - transforming raw API payloads
 *
 * @param props Component props.
 * @returns Category breakdown reporting section.
 */
export default function ReportingCategoryTable({
  points,
}: ReportingCategoryTableProps) {
  // # Step 1: Render themed empty state when no category data exists.
  if (!points.length) {
    return (
      <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Category analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              By category
            </h3>

            <p className="text-sm leading-6 text-neutral-400">
              Expense distribution grouped by category.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-5">
            <p className="text-sm text-neutral-400">
              No category breakdown data is available for the current filter
              set.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // # Step 2: Sort points for a leaderboard-style chart and table.
  const sortedPoints = [...points].sort((left, right) => right.total - left.total);

  // # Step 3: Derive summary values for header badges and chart scaling.
  const totalAcrossCategories = sortedPoints.reduce(
    (runningTotal, point) => runningTotal + point.total,
    0,
  );

  const maxTotal = Math.max(...sortedPoints.map((point) => point.total), 0);

  const topCategoryPoint = sortedPoints[0] ?? null;

  // # Step 4: Render the full themed category reporting card.
  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Category analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              By category
            </h3>

            <p className="mt-1 text-sm leading-6 text-neutral-400">
              Expense distribution grouped by category.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {sortedPoints.length}{" "}
              {sortedPoints.length === 1 ? "category" : "categories"}
            </span>

            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              Total: {formatCurrency(totalAcrossCategories)}
            </span>

            {topCategoryPoint ? (
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Top: {topCategoryPoint.category_name ?? "Uncategorized"}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <section
          aria-label="Expense category distribution chart"
          className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Distribution overview
              </h4>

              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Relative spend concentration across the selected categories.
              </p>
            </div>

            <span className="inline-flex self-start rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
              Max category: {formatCurrency(maxTotal)}
            </span>
          </div>

          <div className="space-y-3">
            {sortedPoints.map((point, index) => (
              <CategoryBarRow
                key={`${point.category_id ?? point.category_name ?? "category"}-${index}`}
                categoryName={point.category_name ?? "Uncategorized"}
                count={point.count}
                total={point.total}
                maxTotal={maxTotal}
                totalAcrossCategories={totalAcrossCategories}
              />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h4 className="text-sm font-semibold text-white">
              Category detail
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-neutral-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Category
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
                    key={`${point.category_id ?? point.category_name ?? "category"}-row-${index}`}
                    className="transition-colors hover:bg-neutral-900/60"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                      {point.category_name ?? "Uncategorized"}
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