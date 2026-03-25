// # Filename: src/features/expenses/pages/components/ExpenseReportingFiltersBar.tsx

// ✅ New Code

import type {
  ExpenseBuildingOption,
  ExpenseCategoryOption,
  ExpenseScope,
  ExpenseUnitOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";

/**
 * Props for the ExpenseReportingFiltersBar component.
 */
interface ExpenseReportingFiltersBarProps {
  selectedScope: ExpenseScope | null;
  selectedCategoryId: number | null;
  selectedVendorId: number | null;
  selectedBuildingId: number | null;
  selectedUnitId: number | null;
  categories?: ExpenseCategoryOption[];
  vendors?: ExpenseVendorOption[];
  buildingOptions?: ExpenseBuildingOption[];
  unitOptions?: ExpenseUnitOption[];
  isPropertyLookupLoading?: boolean;
  propertyLookupErrorMessage?: string | null;
  onScopeChange: (value: ExpenseScope | null) => void;
  onCategoryChange: (value: number | null) => void;
  onVendorChange: (value: number | null) => void;
  onBuildingChange: (value: number | null) => void;
  onUnitChange: (value: number | null) => void;
}

interface SelectControlProps {
  id: string;
  value: string | number;
  disabled?: boolean;
  children: React.ReactNode;
  onChange: (value: string) => void;
}

const SHELL_CLASS =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

const INNER_CLASS = "flex flex-col gap-5 p-5 sm:p-6";

const TOP_ROW_CLASS =
  "flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between";

const EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

const TITLE_CLASS = "text-2xl font-semibold tracking-tight text-white";

const DESCRIPTION_CLASS = "max-w-3xl text-sm leading-6 text-neutral-400";

const BADGE_CLASS =
  "inline-flex items-center self-start rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300";

const ALERT_CLASS =
  "rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200";

const CONTROLS_GRID_CLASS =
  "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5";

const LABEL_CLASS =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500";

const SELECT_WRAPPER_CLASS = "relative";

const SELECT_CLASS =
  "w-full appearance-none rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-500 hover:border-neutral-700 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60";

const CHEVRON_CLASS =
  "pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-500";

const ACTIVE_FILTER_PILL_CLASS =
  "inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300";

const CLEAR_BUTTON_CLASS =
  "inline-flex items-center rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-white";

/**
 * Lightweight select wrapper so the reporting filter bar visually matches
 * the records filter bar without forcing a broader refactor yet.
 *
 * @param props Component props.
 * @returns Styled select control.
 */
function SelectControl({
  id,
  value,
  disabled = false,
  children,
  onChange,
}: SelectControlProps) {
  return (
    <div className={SELECT_WRAPPER_CLASS}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS}
      >
        {children}
      </select>

      <div className={CHEVRON_CLASS} aria-hidden="true">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Parses a nullable numeric select value.
 *
 * @param value Raw select value.
 * @returns Parsed numeric identifier or null.
 */
function parseNullableId(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Parses a nullable scope select value.
 *
 * @param value Raw select value.
 * @returns Scope or null.
 */
function parseNullableScope(value: string): ExpenseScope | null {
  if (!value) {
    return null;
  }

  return value as ExpenseScope;
}

/**
 * Resolves a human-readable scope label for active filter pills.
 *
 * @param selectedScope Selected scope value.
 * @returns Readable scope label or null.
 */
function getSelectedScopeLabel(
  selectedScope: ExpenseScope | null,
): string | null {
  if (!selectedScope) {
    return null;
  }

  if (selectedScope === "organization") {
    return "Portfolio only";
  }

  if (selectedScope === "building") {
    return "Building only";
  }

  if (selectedScope === "unit") {
    return "Unit only";
  }

  if (selectedScope === "lease") {
    return "Lease only";
  }

  return null;
}

/**
 * Resolves a selected category name from available options.
 *
 * @param categories Category options.
 * @param selectedCategoryId Selected category id.
 * @returns Category name or null.
 */
function getSelectedCategoryName(
  categories: ExpenseCategoryOption[],
  selectedCategoryId: number | null,
): string | null {
  if (selectedCategoryId == null) {
    return null;
  }

  const match = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return match?.name ?? null;
}

/**
 * Resolves a selected vendor name from available options.
 *
 * @param vendors Vendor options.
 * @param selectedVendorId Selected vendor id.
 * @returns Vendor name or null.
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
 * Resolves a selected building name from available options.
 *
 * @param buildingOptions Building options.
 * @param selectedBuildingId Selected building id.
 * @returns Building name or null.
 */
function getSelectedBuildingName(
  buildingOptions: ExpenseBuildingOption[],
  selectedBuildingId: number | null,
): string | null {
  if (selectedBuildingId == null) {
    return null;
  }

  const match = buildingOptions.find(
    (building) => building.id === selectedBuildingId,
  );

  return match?.name ?? null;
}

/**
 * Resolves a selected unit name from available options.
 *
 * @param unitOptions Unit options.
 * @param selectedUnitId Selected unit id.
 * @returns Unit name or null.
 */
function getSelectedUnitName(
  unitOptions: ExpenseUnitOption[],
  selectedUnitId: number | null,
): string | null {
  if (selectedUnitId == null) {
    return null;
  }

  const match = unitOptions.find((unit) => unit.id === selectedUnitId);

  return match?.name ?? match?.unit_number ?? null;
}

/**
 * Reporting-focused filter bar for the expense reporting workspace.
 *
 * Responsibilities:
 * - expose reporting-safe filters only
 * - mirror the records filter bar design language
 * - surface active filter state clearly
 *
 * Non-responsibilities:
 * - fetching reporting data
 * - search input
 * - archived-only toggles
 *
 * @param props Component props.
 * @returns Reporting filter bar UI.
 */
export default function ExpenseReportingFiltersBar({
  selectedScope,
  selectedCategoryId,
  selectedVendorId,
  selectedBuildingId,
  selectedUnitId,
  categories = [],
  vendors = [],
  buildingOptions = [],
  unitOptions = [],
  isPropertyLookupLoading = false,
  propertyLookupErrorMessage = null,
  onScopeChange,
  onCategoryChange,
  onVendorChange,
  onBuildingChange,
  onUnitChange,
}: ExpenseReportingFiltersBarProps) {
  // # Step 1: Resolve active filter labels for display pills.
  const selectedScopeLabel = getSelectedScopeLabel(selectedScope);
  const selectedCategoryName = getSelectedCategoryName(
    categories,
    selectedCategoryId,
  );
  const selectedVendorName = getSelectedVendorName(vendors, selectedVendorId);
  const selectedBuildingName = getSelectedBuildingName(
    buildingOptions,
    selectedBuildingId,
  );
  const selectedUnitName = getSelectedUnitName(unitOptions, selectedUnitId);

  // # Step 2: Determine whether any reporting filters are active.
  const hasActiveFilters = Boolean(
    selectedScope !== null ||
      selectedCategoryId !== null ||
      selectedVendorId !== null ||
      selectedBuildingId !== null ||
      selectedUnitId !== null,
  );

  return (
    <section className={SHELL_CLASS}>
      <div className={INNER_CLASS}>
        <div className={TOP_ROW_CLASS}>
          <div className="flex min-w-0 flex-col gap-1">
            <p className={EYEBROW_CLASS}>Reporting workspace</p>
            <h2 className={TITLE_CLASS}>Filter reporting</h2>
            <p className={DESCRIPTION_CLASS}>
              Slice reporting by scope, property, category, and vendor while
              keeping the workspace deterministic and easy to scan.
            </p>
          </div>

          <div className={BADGE_CLASS}>Shared reporting filters</div>
        </div>

        {propertyLookupErrorMessage ? (
          <div className={ALERT_CLASS}>{propertyLookupErrorMessage}</div>
        ) : null}

        <div className={CONTROLS_GRID_CLASS}>
          <div>
            <label htmlFor="reporting-scope-filter" className={LABEL_CLASS}>
              Scope
            </label>

            <SelectControl
              id="reporting-scope-filter"
              value={selectedScope ?? ""}
              onChange={(value) => onScopeChange(parseNullableScope(value))}
            >
              <option value="">All scopes</option>
              <option value="organization">Portfolio only</option>
              <option value="building">Building only</option>
              <option value="unit">Unit only</option>
              <option value="lease">Lease only</option>
            </SelectControl>
          </div>

          <div>
            <label htmlFor="reporting-category-filter" className={LABEL_CLASS}>
              Category
            </label>

            <SelectControl
              id="reporting-category-filter"
              value={selectedCategoryId ?? ""}
              onChange={(value) => onCategoryChange(parseNullableId(value))}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectControl>
          </div>

          <div>
            <label htmlFor="reporting-vendor-filter" className={LABEL_CLASS}>
              Vendor
            </label>

            <SelectControl
              id="reporting-vendor-filter"
              value={selectedVendorId ?? ""}
              onChange={(value) => onVendorChange(parseNullableId(value))}
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </SelectControl>
          </div>

          <div>
            <label htmlFor="reporting-building-filter" className={LABEL_CLASS}>
              Building
            </label>

            <SelectControl
              id="reporting-building-filter"
              value={selectedBuildingId ?? ""}
              onChange={(value) => onBuildingChange(parseNullableId(value))}
            >
              <option value="">
                {isPropertyLookupLoading ? "Loading buildings..." : "All buildings"}
              </option>
              {buildingOptions.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </SelectControl>
          </div>

          <div>
            <label htmlFor="reporting-unit-filter" className={LABEL_CLASS}>
              Unit
            </label>

            <SelectControl
              id="reporting-unit-filter"
              value={selectedUnitId ?? ""}
              onChange={(value) => onUnitChange(parseNullableId(value))}
              disabled={!selectedBuildingId}
            >
              <option value="">
                {selectedBuildingId ? "All units" : "Select a building first"}
              </option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name ?? unit.unit_number ?? `Unit #${unit.id}`}
                </option>
              ))}
            </SelectControl>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
            {selectedScopeLabel ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Scope: {selectedScopeLabel}
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

            {selectedBuildingName ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Building: {selectedBuildingName}
              </span>
            ) : null}

            {selectedUnitName ? (
              <span className={ACTIVE_FILTER_PILL_CLASS}>
                Unit: {selectedUnitName}
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onScopeChange(null);
                onCategoryChange(null);
                onVendorChange(null);
                onBuildingChange(null);
                onUnitChange(null);
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