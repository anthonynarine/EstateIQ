// # Filename: src/features/expenses/pages/components/ExpensesFiltersBar.tsx


import type {
  ExpenseCategoryOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";

/**
 * Props for the ExpensesFiltersBar component.
 */
interface ExpensesFiltersBarProps {
  searchInput: string;
  selectedCategoryId: number | null;
  selectedVendorId: number | null;
  showArchivedOnly: boolean;
  totalExpenseCount: number;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: number | null) => void;
  onVendorChange: (value: number | null) => void;
  onArchivedToggle: (value: boolean) => void;
}

/**
 * ExpensesFiltersBar
 *
 * Page-level filter controls for the Expenses feature.
 *
 * Responsibilities:
 * - search input
 * - category filter
 * - vendor filter
 * - archived-only toggle
 * - record count summary
 *
 * @param props Component props.
 * @returns Filter bar UI.
 */
export default function ExpensesFiltersBar({
  searchInput,
  selectedCategoryId,
  selectedVendorId,
  showArchivedOnly,
  totalExpenseCount,
  categories,
  vendors,
  onSearchChange,
  onCategoryChange,
  onVendorChange,
  onArchivedToggle,
}: ExpensesFiltersBarProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2 xl:col-span-2">
          <label
            htmlFor="expense-search"
            className="text-sm font-medium text-slate-700"
          >
            Search
          </label>
          <input
            id="expense-search"
            type="text"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search description or notes"
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="expense-filter-category"
            className="text-sm font-medium text-slate-700"
          >
            Category Filter
          </label>
          <select
            id="expense-filter-category"
            value={selectedCategoryId ?? ""}
            onChange={(event) =>
              onCategoryChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="expense-filter-vendor"
            className="text-sm font-medium text-slate-700"
          >
            Vendor Filter
          </label>
          <select
            id="expense-filter-vendor"
            value={selectedVendorId ?? ""}
            onChange={(event) =>
              onVendorChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showArchivedOnly}
              onChange={(event) => onArchivedToggle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show archived only
          </label>

          <span className="text-sm text-slate-500">
            Records: {totalExpenseCount}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Archived expenses are excluded from reporting by default.
        </p>
      </div>
    </section>
  );
}