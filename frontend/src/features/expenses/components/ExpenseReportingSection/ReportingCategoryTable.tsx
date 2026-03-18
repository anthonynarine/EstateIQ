// # Filename: src/features/expenses/components/ExpenseReportingSection/ReportingCategoryTable.tsx


import type { ExpenseByCategoryPoint } from "../../api/expensesTypes";
import { formatCurrency, formatNumber } from "./reportingFormatters";

/**
 * Props for the ReportingCategoryTable component.
 */
interface ReportingCategoryTableProps {
  points: ExpenseByCategoryPoint[];
}

/**
 * ReportingCategoryTable
 *
 * Renders the expense category breakdown as a reporting table.
 *
 * Responsibilities:
 * - display normalized category reporting rows
 * - format count and total values consistently
 * - keep category-specific markup out of the reporting wrapper
 *
 * Non-responsibilities:
 * - fetching data
 * - loading/error orchestration
 * - transforming raw API payloads
 *
 * @param props Component props.
 * @returns Category breakdown reporting table.
 */
export default function ReportingCategoryTable({
  points,
}: ReportingCategoryTableProps) {
  // # Step 1: Render an empty state when no category data exists.
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            By Category
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Expense distribution grouped by category.
          </p>
        </div>

        <div className="px-6 py-4 text-sm text-slate-500">
          No category breakdown data is available.
        </div>
      </div>
    );
  }

  // # Step 2: Render the category breakdown table when data exists.
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-slate-900">
          By Category
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Expense distribution grouped by category.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Count
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {points.map((point, index) => (
              <tr
                key={`${point.category_id ?? point.category_name ?? "category"}-${index}`}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 text-sm text-slate-700">
                  {point.category_name ?? "Uncategorized"}
                </td>
                <td className="px-6 py-4 text-right text-sm text-slate-700">
                  {formatNumber(point.count)}
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