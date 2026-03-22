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
  onArchivedToggle: (nextValue: boolean) => void;
}

const SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const INNER_CLASS = "flex flex-col gap-4 p-4 sm:p-5";

const TOP_ROW_CLASS =
  "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between";

const TITLE_WRAP_CLASS = "flex min-w-0 flex-col gap-1";

const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

const TITLE_CLASS = "text-lg font-semibold tracking-tight text-white";

const DESCRIPTION_CLASS = "text-sm text-neutral-400";

const COUNT_BADGE_CLASS =
  "inline-flex w-fit items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300";

const CONTROLS_GRID_CLASS =
  "grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]";

const LABEL_CLASS =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500";

const INPUT_CLASS =
  "w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20";

const TOGGLE_WRAPPER_CLASS =
  "flex h-full items-end";

const TOGGLE_BUTTON_BASE_CLASS =
  "inline-flex min-h-[42px] w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 xl:w-auto xl:min-w-[170px]";

const TOGGLE_BUTTON_ACTIVE_CLASS =
  "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";

const TOGGLE_BUTTON_INACTIVE_CLASS =
  "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800/80";

const ACTIVE_FILTER_PILL_CLASS =
  "inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300";

const CLEAR_BUTTON_CLASS =
  "inline-flex items-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70";

/**
 * Safely converts a select value into a nullable numeric identifier.
 *
 * @param value Raw select value.
 * @returns Numeric id or null when no selection exists.
 */
function parseNullableId(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Returns the selected category display name when present.
 *
 * @param categories Available category options.
 * @param selectedCategoryId Currently selected category id.
 * @returns Matching category name or null.
 */
function getSelectedCategoryName(
  categories: ExpenseCategoryOption[],
  selectedCategoryId: number | null,
): string | null {
  if (selectedCategoryId == null) {
    return null;
  }

  const match = categories.find((category) => category.id === selectedCategoryId);
  return match?.name ?? null;
}

/**
 * Returns the selected vendor display name when present.
 *
 * @param vendors Available vendor options.
 * @param selectedVendorId Currently selected vendor id.
 * @returns Matching vendor name or null.
 */
function getSelectedVendorName(
  vendors: ExpenseVendorOption[],
  selectedVendorId: number | null,
): string | null {
  if (selectedVendorId == null) {
    return null;
  }

  const match = vendors.find((vendor) => vendor.id === selectedVendorId);
  return match?.name ?? null;
}

/**
 * Records workspace filter bar for the Expenses page.
 *
 * Responsibilities:
 * - search expense records
 * - narrow records by category and vendor
 * - toggle archived-only mode
 * - surface the current record count
 *
 * Design intent:
 * - compact and calm
 * - dark-shell aligned with the rest of EstateIQ
 * - responsive for both desktop and mobile
 *
 * @param props Component props.
 * @returns Filter/search UI for the Records workspace.
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
  const selectedCategoryName = getSelectedCategoryName(
    categories,
    selectedCategoryId,
  );
  const selectedVendorName = getSelectedVendorName(vendors, selectedVendorId);

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      selectedCategoryId !== null ||
      selectedVendorId !== null ||
      showArchivedOnly,
  );

  return (
    <section className={SHELL_CLASS}>
      <div className={INNER_CLASS}>
        <div className={TOP_ROW_CLASS}>
          <div className={TITLE_WRAP_CLASS}>
            <p className={EYEBROW_CLASS}>Records workspace</p>
            <h2 className={TITLE_CLASS}>Search and filter expenses</h2>
            <p className={DESCRIPTION_CLASS}>
              Narrow the operational list without losing context.
            </p>
          </div>

          <div className={COUNT_BADGE_CLASS}>
            {totalExpenseCount} {totalExpenseCount === 1 ? "expense" : "expenses"}
          </div>
        </div>

        <div className={CONTROLS_GRID_CLASS}>
          <div>
            <label htmlFor="expense-search" className={LABEL_CLASS}>
              Search
            </label>
            <input
              id="expense-search"
              type="text"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by title, description, notes, or amount..."
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="expense-category-filter" className={LABEL_CLASS}>
              Category
            </label>
            <select
              id="expense-category-filter"
              value={selectedCategoryId ?? ""}
              onChange={(event) =>
                onCategoryChange(parseNullableId(event.target.value))
              }
              className={INPUT_CLASS}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-vendor-filter" className={LABEL_CLASS}>
              Vendor
            </label>
            <select
              id="expense-vendor-filter"
              value={selectedVendorId ?? ""}
              onChange={(event) =>
                onVendorChange(parseNullableId(event.target.value))
              }
              className={INPUT_CLASS}
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className={TOGGLE_WRAPPER_CLASS}>
            <button
              type="button"
              onClick={() => onArchivedToggle(!showArchivedOnly)}
              className={`${TOGGLE_BUTTON_BASE_CLASS} ${
                showArchivedOnly
                  ? TOGGLE_BUTTON_ACTIVE_CLASS
                  : TOGGLE_BUTTON_INACTIVE_CLASS
              }`}
              aria-pressed={showArchivedOnly}
            >
              <span>Archived only</span>
              <span className="ml-3 text-xs">
                {showArchivedOnly ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
            {searchInput.trim() ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Search: {searchInput.trim()}
              </span>
            ) : null}

            {selectedCategoryName ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Category: {selectedCategoryName}
              </span>
            ) : null}

            {selectedVendorName ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Vendor: {selectedVendorName}
              </span>
            ) : null}

            {showArchivedOnly ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>Archived only</span>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                onCategoryChange(null);
                onVendorChange(null);
                onArchivedToggle(false);
              }}
              className={CLEAR_BUTTON_CLASS}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}