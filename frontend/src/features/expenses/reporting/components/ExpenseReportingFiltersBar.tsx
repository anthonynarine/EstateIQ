import { useState, type ReactNode } from "react";

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
  isPropertyLookupLoading?: boolean;
  propertyLookupErrorMessage?: string | null;
  selectedUnitId: number | null;
  categories?: ExpenseCategoryOption[];
  vendors?: ExpenseVendorOption[];
  buildingOptions?: ExpenseBuildingOption[];
  unitOptions?: ExpenseUnitOption[];
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
  children: ReactNode;
  onChange: (value: string) => void;
}

const WRAPPER_CLASS = "flex flex-col gap-3";

const TOP_ROW_CLASS =
  "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between";

const ALERT_CLASS =
  "rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200";

const HELPER_TEXT_CLASS = "text-xs leading-5 text-neutral-500";

const HELP_BUTTON_CLASS =
  "inline-flex items-center gap-2 self-start rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white";

const HELP_PANEL_CLASS =
  "rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4";

const HELP_GRID_CLASS = "grid grid-cols-1 gap-3 xl:grid-cols-2";

const HELP_CARD_CLASS =
  "rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3";

const HELP_CARD_TITLE_CLASS = "text-sm font-semibold text-white";

const HELP_CARD_TEXT_CLASS = "mt-1 text-xs leading-5 text-neutral-400";

const CONTROLS_GRID_CLASS =
  "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5";

const LABEL_CLASS =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500";

const SELECT_WRAPPER_CLASS = "relative";

const SELECT_CLASS =
  "w-full appearance-none rounded-2xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 hover:border-neutral-700 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60";

const CHEVRON_CLASS =
  "pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500";

const CONTEXT_ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800/80 pt-3";

const CONTEXT_CHIPS_CLASS = "flex flex-wrap items-center gap-2";

const CONTEXT_PILL_CLASS =
  "inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-medium text-neutral-300";

const CLEAR_BUTTON_CLASS =
  "inline-flex items-center rounded-full border border-neutral-800 bg-transparent px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-white";

/**
 * Lightweight select wrapper for reporting filters.
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
 * Reporting-focused filter controls rendered inside the reporting header.
 *
 * @param props Component props.
 * @returns Reporting filter controls.
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
  // # Step 1: Resolve compact context labels.
  const selectedBuildingName = getSelectedBuildingName(
    buildingOptions,
    selectedBuildingId,
  );
  const selectedUnitName = getSelectedUnitName(unitOptions, selectedUnitId);

  // # Step 2: Determine whether any filters are currently active.
  const hasActiveFilters = Boolean(
    selectedScope !== null ||
      selectedCategoryId !== null ||
      selectedVendorId !== null ||
      selectedBuildingId !== null ||
      selectedUnitId !== null,
  );

  // # Step 3: Track contextual help visibility locally.
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className={WRAPPER_CLASS}>
      <div className={TOP_ROW_CLASS}>
        <p className={HELPER_TEXT_CLASS}>
          Building and Unit choose the property context. Expense level chooses
          what level the expense record was created at.
        </p>

        <button
          type="button"
          onClick={() => setIsHelpOpen((currentValue) => !currentValue)}
          aria-expanded={isHelpOpen}
          className={HELP_BUTTON_CLASS}
        >
          <span>{isHelpOpen ? "Hide filter help" : "How filters work"}</span>

          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 transition-transform ${
              isHelpOpen ? "rotate-180" : ""
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

      {isHelpOpen ? (
        <section className={HELP_PANEL_CLASS} aria-label="How reporting filters work">
          <div className={HELP_GRID_CLASS}>
            <article className={HELP_CARD_CLASS}>
              <h3 className={HELP_CARD_TITLE_CLASS}>Property context</h3>
              <p className={HELP_CARD_TEXT_CLASS}>
                Use <strong>Building</strong> and <strong>Unit</strong> to choose
                where you are analyzing. A selected building rolls up everything
                attributable to that building. A selected unit narrows to that
                unit.
              </p>
            </article>

            <article className={HELP_CARD_CLASS}>
              <h3 className={HELP_CARD_TITLE_CLASS}>Expense level</h3>
              <p className={HELP_CARD_TEXT_CLASS}>
                Use <strong>Expense level</strong> to filter by the kind of
                record that was created: portfolio-level, building-level,
                unit-level, or lease-level.
              </p>
            </article>

            <article className={HELP_CARD_CLASS}>
              <h3 className={HELP_CARD_TITLE_CLASS}>Example: all properties</h3>
              <p className={HELP_CARD_TEXT_CLASS}>
                <strong>All properties + All expense levels</strong> shows all
                expenses in the organization. <strong>All properties +
                Building-level only</strong> shows only explicitly building-level
                expenses across the portfolio.
              </p>
            </article>

            <article className={HELP_CARD_CLASS}>
              <h3 className={HELP_CARD_TITLE_CLASS}>Example: one building</h3>
              <p className={HELP_CARD_TEXT_CLASS}>
                <strong>Coconut Grove + All expense levels</strong> shows all
                expenses attributable to Coconut Grove. <strong>Coconut Grove +
                Building-level only</strong> shows only building-level expenses
                created for Coconut Grove.
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {propertyLookupErrorMessage ? (
        <div className={ALERT_CLASS}>{propertyLookupErrorMessage}</div>
      ) : null}

      <div className={CONTROLS_GRID_CLASS}>
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
              {isPropertyLookupLoading
                ? "Loading properties..."
                : "All properties"}
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
              {selectedBuildingId ? "All units" : "Select building first"}
            </option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name ?? unit.unit_number ?? `Unit #${unit.id}`}
              </option>
            ))}
          </SelectControl>
        </div>

        <div>
          <label htmlFor="reporting-scope-filter" className={LABEL_CLASS}>
            Expense level
          </label>

          <SelectControl
            id="reporting-scope-filter"
            value={selectedScope ?? ""}
            onChange={(value) => onScopeChange(parseNullableScope(value))}
          >
            <option value="">All expense levels</option>
            <option value="organization">Portfolio-level only</option>
            <option value="building">Building-level only</option>
            <option value="unit">Unit-level only</option>
            <option value="lease">Lease-level only</option>
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
      </div>

      {hasActiveFilters ? (
        <div className={CONTEXT_ROW_CLASS}>
          <div className={CONTEXT_CHIPS_CLASS}>
            {selectedBuildingName ? (
              <span className={CONTEXT_PILL_CLASS}>
                Building: {selectedBuildingName}
              </span>
            ) : null}

            {selectedUnitName ? (
              <span className={CONTEXT_PILL_CLASS}>
                Unit: {selectedUnitName}
              </span>
            ) : null}
          </div>

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
  );
}