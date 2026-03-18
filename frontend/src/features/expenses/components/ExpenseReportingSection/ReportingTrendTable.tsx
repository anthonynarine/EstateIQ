// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingTrendTable.tsx


import type { ExpenseMonthlyTrendPoint } from "../../api/expensesTypes";
import { formatCurrency } from "./reportingFormatters";

/**
 * Props for the ReportingTrendTable component.
 */
interface ReportingTrendTableProps {
  points: ExpenseMonthlyTrendPoint[];
}

/**
 * ReportingTrendTable
 *
 * Renders monthly expense trend data as a simple reporting table.
 *
 * Responsibilities:
 * - display normalized monthly trend points
 * - keep trend-specific table markup out of the wrapper component
 * - format totals consistently for finance reporting
 *
 * Non-responsibilities:
 * - fetching data
 * - loading/error state orchestration
 * - transforming raw API payloads
 *
 * @param props Component props.
 * @returns Monthly trend reporting table.
 */
export default function ReportingTrendTable({
  points,
}: ReportingTrendTableProps) {
  // # Step 1: Render an empty state when no monthly trend data exists.
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Monthly Trend
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Expense totals by month for the current reporting range.
          </p>
        </div>

        <div className="px-6 py-4 text-sm text-slate-500">
          No monthly trend data is available.
        </div>
      </div>
    );
  }

  // # Step 2: Render the monthly trend table when data exists.
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-slate-900">
          Monthly Trend
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Expense totals by month for the current reporting range.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Month
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {points.map((point, index) => (
              <tr
                key={`${point.month}-${index}`}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 text-sm text-slate-700">
                  {point.month}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                  {formatCurrency(point.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}