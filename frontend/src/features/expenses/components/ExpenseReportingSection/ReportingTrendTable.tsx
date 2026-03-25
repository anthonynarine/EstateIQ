// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingTrendTable.tsx

// ✅ New Code

import type { ExpenseMonthlyTrendPoint } from "../../api/expensesTypes";
import { formatCurrency } from "./reportingFormatters";

/**
 * Props for the ReportingTrendTable component.
 */
interface ReportingTrendTableProps {
  points: ExpenseMonthlyTrendPoint[];
}

interface TrendBarRowProps {
  month: string;
  total: number;
  maxTotal: number;
}

/**
 * Renders a single visual trend row using a proportional bar.
 *
 * @param props Component props.
 * @returns A themed trend row.
 */
function TrendBarRow({ month, total, maxTotal }: TrendBarRowProps) {
  // # Step 1: Compute a safe bar width percentage.
  const rawWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const widthPercentage = Math.max(rawWidth, total > 0 ? 6 : 0);

  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)_104px] items-center gap-3">
      <div className="truncate text-sm font-medium text-neutral-300">
        {month}
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-neutral-900">
        <div
          className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
          style={{ width: `${Math.min(widthPercentage, 100)}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="text-right text-sm font-medium text-white">
        {formatCurrency(total)}
      </div>
    </div>
  );
}

/**
 * ReportingTrendTable
 *
 * Renders monthly expense trend data as a themed reporting card with:
 * - reporting header
 * - compact visual chart
 * - trustworthy detail table
 *
 * Responsibilities:
 * - display normalized monthly trend points
 * - render a lightweight chart without extra dependencies
 * - keep finance reporting clear and readable
 *
 * Non-responsibilities:
 * - fetching data
 * - filter state
 * - loading/error orchestration from parent queries
 *
 * @param props Component props.
 * @returns Monthly trend reporting section.
 */
export default function ReportingTrendTable({
  points,
}: ReportingTrendTableProps) {
  // # Step 1: Render themed empty state when no monthly trend exists.
  if (!points.length) {
    return (
      <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Trend analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Monthly trend
            </h3>

            <p className="text-sm leading-6 text-neutral-400">
              Expense totals by month for the current reporting range.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-5">
            <p className="text-sm text-neutral-400">
              No monthly trend data is available for the current filter set.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // # Step 2: Derive chart summary values.
  const maxTotal = Math.max(...points.map((point) => point.total), 0);
  const peakPoint = points.reduce<ExpenseMonthlyTrendPoint | null>(
    (currentPeak, point) => {
      if (!currentPeak || point.total > currentPeak.total) {
        return point;
      }

      return currentPeak;
    },
    null,
  );

  const totalAcrossMonths = points.reduce(
    (runningTotal, point) => runningTotal + point.total,
    0,
  );

  // # Step 3: Render the full themed reporting card.
  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Trend analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Monthly trend
            </h3>

            <p className="mt-1 text-sm leading-6 text-neutral-400">
              Expense totals by month for the current reporting range.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {points.length} {points.length === 1 ? "month" : "months"}
            </span>

            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              Total: {formatCurrency(totalAcrossMonths)}
            </span>

            {peakPoint ? (
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Peak: {peakPoint.month}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <section
          aria-label="Monthly expense trend chart"
          className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Trend overview
              </h4>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Relative monthly expense intensity for the selected reporting
                view.
              </p>
            </div>

            <span className="inline-flex self-start rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
              Max month: {formatCurrency(maxTotal)}
            </span>
          </div>

          <div className="space-y-3">
            {points.map((point, index) => (
              <TrendBarRow
                key={`${point.month}-${index}`}
                month={point.month}
                total={point.total}
                maxTotal={maxTotal}
              />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h4 className="text-sm font-semibold text-white">
              Monthly detail
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-neutral-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Month
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {points.map((point, index) => (
                  <tr
                    key={`${point.month}-row-${index}`}
                    className="transition-colors hover:bg-neutral-900/60"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                      {point.month}
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