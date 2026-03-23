// # Filename: src/features/expenses/components/expense-form/ExpenseFormFields.tsx
// ✅ New Code

import { useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";

import type {
  ExpenseBuildingOption,
  ExpenseCategoryOption,
  ExpenseScope,
  ExpenseUnitOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import type { ExpenseFormValues } from "./expenseFormTypes";

interface ExpenseFormFieldsProps {
  formValues: ExpenseFormValues;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  buildingOptions?: ExpenseBuildingOption[];
  unitOptions?: ExpenseUnitOption[];
  updateField: (
    field: keyof ExpenseFormValues,
    value: ExpenseFormValues[keyof ExpenseFormValues],
  ) => void;
  onAddVendorClick: () => void;
  isAddVendorDisabled?: boolean;
}

export default function ExpenseFormFields({
  formValues,
  categories,
  vendors,
  buildingOptions = [],
  unitOptions = [],
  updateField,
  onAddVendorClick,
  isAddVendorDisabled = false,
}: ExpenseFormFieldsProps) {
  const hasVendors = vendors.length > 0;
  const selectedScope: ExpenseScope = formValues.scope ?? "organization";

  const availableUnits = useMemo(() => {
    if (selectedScope !== "unit") {
      return [];
    }

    if (!formValues.building_id) {
      return [];
    }

    return unitOptions.filter((unit) => {
      if (unit.building_id === undefined || unit.building_id === null) {
        return true;
      }

      return unit.building_id === formValues.building_id;
    });
  }, [formValues.building_id, selectedScope, unitOptions]);

  const labelClassName =
    "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

  const fieldHeaderClassName =
    "flex min-h-[36px] items-end justify-between gap-3";

  const fieldControlWrapperClassName = "relative mt-1.5";

  const baseFieldClassName =
    "w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none ring-1 ring-white/[0.04] transition focus:border-cyan-400/25 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15";

  const selectClassName =
    `${baseFieldClassName} appearance-none bg-neutral-950 pr-12`;

  const optionClassName = "bg-neutral-950 text-white";

  const dateInputClassName =
    `${baseFieldClassName} bg-white/[0.07] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90`;

  const vendorButtonClassName =
    "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-100 ring-1 ring-white/[0.04] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

  const handleScopeChange = (nextScope: ExpenseScope) => {
    updateField("scope", nextScope);

    if (nextScope === "organization") {
      updateField("building_id", null);
      updateField("unit_id", null);
      updateField("lease_id", null);
      return;
    }

    if (nextScope === "building") {
      updateField("unit_id", null);
      updateField("lease_id", null);
      return;
    }

    if (nextScope === "unit") {
      updateField("lease_id", null);
      return;
    }
  };

  const handleBuildingChange = (nextBuildingId: number | null) => {
    updateField("building_id", nextBuildingId);

    if (!nextBuildingId) {
      updateField("unit_id", null);
      return;
    }

    const selectedUnitStillMatches = availableUnits.some(
      (unit) => unit.id === formValues.unit_id,
    );

    if (!selectedUnitStillMatches) {
      updateField("unit_id", null);
    }
  };

  const getUnitLabel = (unit: ExpenseUnitOption): string => {
    return unit.name ?? unit.unit_number ?? `Unit #${unit.id}`;
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-scope" className={labelClassName}>
            Scope
          </label>
          <span className="invisible text-xs">spacer</span>
        </div>

        <div className={fieldControlWrapperClassName}>
          <select
            id="expense-scope"
            value={selectedScope}
            onChange={(event) =>
              handleScopeChange(event.target.value as ExpenseScope)
            }
            className={selectClassName}
          >
            <option value="organization" className={optionClassName}>
              Portfolio / Organization
            </option>
            <option value="building" className={optionClassName}>
              Building
            </option>
            <option value="unit" className={optionClassName}>
              Unit
            </option>
            {selectedScope === "lease" ? (
              <option value="lease" className={optionClassName}>
                Lease
              </option>
            ) : null}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {selectedScope === "building" || selectedScope === "unit" ? (
        <div>
          <div className={fieldHeaderClassName}>
            <label htmlFor="expense-building" className={labelClassName}>
              Building
            </label>
            <span className="invisible text-xs">spacer</span>
          </div>

          <div className={fieldControlWrapperClassName}>
            <select
              id="expense-building"
              value={formValues.building_id ?? ""}
              onChange={(event) =>
                handleBuildingChange(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className={selectClassName}
            >
              <option value="" className={optionClassName}>
                Select a building
              </option>
              {buildingOptions.map((building) => (
                <option
                  key={building.id}
                  value={building.id}
                  className={optionClassName}
                >
                  {building.name}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      ) : (
        <div>
          <div className={fieldHeaderClassName}>
            <label htmlFor="expense-date" className={labelClassName}>
              Expense Date
            </label>
            <span className="invisible text-xs">spacer</span>
          </div>

          <div className={fieldControlWrapperClassName}>
            <input
              id="expense-date"
              type="date"
              value={formValues.expense_date}
              onChange={(event) => updateField("expense_date", event.target.value)}
              className={dateInputClassName}
            />
          </div>
        </div>
      )}

      {selectedScope === "unit" ? (
        <div>
          <div className={fieldHeaderClassName}>
            <label htmlFor="expense-unit" className={labelClassName}>
              Unit
            </label>
            <span className="invisible text-xs">spacer</span>
          </div>

          <div className={fieldControlWrapperClassName}>
            <select
              id="expense-unit"
              value={formValues.unit_id ?? ""}
              onChange={(event) =>
                updateField(
                  "unit_id",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              disabled={!formValues.building_id}
              className={selectClassName}
            >
              <option value="" className={optionClassName}>
                {formValues.building_id
                  ? "Select a unit"
                  : "Select a building first"}
              </option>

              {availableUnits.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.id}
                  className={optionClassName}
                >
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      ) : null}

      {(selectedScope === "building" || selectedScope === "unit") && (
        <div>
          <div className={fieldHeaderClassName}>
            <label htmlFor="expense-date-scoped" className={labelClassName}>
              Expense Date
            </label>
            <span className="invisible text-xs">spacer</span>
          </div>

          <div className={fieldControlWrapperClassName}>
            <input
              id="expense-date-scoped"
              type="date"
              value={formValues.expense_date}
              onChange={(event) => updateField("expense_date", event.target.value)}
              className={dateInputClassName}
            />
          </div>
        </div>
      )}

      <div className="md:col-span-2">
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-description" className={labelClassName}>
            Description
          </label>
          <span className="invisible text-xs">spacer</span>
        </div>

        <div className={fieldControlWrapperClassName}>
          <input
            id="expense-description"
            type="text"
            value={formValues.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Ex: Plumbing repair, utility bill, landscaping"
            className={baseFieldClassName}
          />
        </div>
      </div>

      <div>
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-amount" className={labelClassName}>
            Amount
          </label>
          <span className="invisible text-xs">spacer</span>
        </div>

        <div className={fieldControlWrapperClassName}>
          <input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={formValues.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="0.00"
            className={baseFieldClassName}
          />
        </div>
      </div>

      <div>
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-category" className={labelClassName}>
            Category
          </label>

          <span className="invisible inline-flex h-7 items-center px-3 text-xs">
            spacer
          </span>
        </div>

        <div className={fieldControlWrapperClassName}>
          <select
            id="expense-category"
            value={formValues.category_id ?? ""}
            onChange={(event) =>
              updateField(
                "category_id",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={selectClassName}
          >
            <option value="" className={optionClassName}>
              Select a category
            </option>
            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
                className={optionClassName}
              >
                {category.name}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      <div>
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-vendor" className={labelClassName}>
            Vendor
          </label>

          <button
            type="button"
            onClick={onAddVendorClick}
            disabled={isAddVendorDisabled}
            className={vendorButtonClassName}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add vendor</span>
          </button>
        </div>

        <div className={fieldControlWrapperClassName}>
          <select
            id="expense-vendor"
            value={formValues.vendor_id ?? ""}
            onChange={(event) =>
              updateField(
                "vendor_id",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={selectClassName}
          >
            <option value="" className={optionClassName}>
              Select a vendor
            </option>
            {vendors.map((vendor) => (
              <option
                key={vendor.id}
                value={vendor.id}
                className={optionClassName}
              >
                {vendor.name}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>

        {!hasVendors ? (
          <p className="mt-2 text-xs text-neutral-500">
            No vendors yet. Add one to keep expense entry structured.
          </p>
        ) : null}
      </div>

      <div className="md:col-span-2">
        <div className={fieldHeaderClassName}>
          <label htmlFor="expense-notes" className={labelClassName}>
            Notes
          </label>

          <span className="text-xs text-neutral-500">Optional</span>
        </div>

        <div className={fieldControlWrapperClassName}>
          <textarea
            id="expense-notes"
            rows={2}
            value={formValues.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Optional internal notes for this expense"
            className={baseFieldClassName}
          />
        </div>
      </div>

      {selectedScope === "lease" ? (
        <div className="md:col-span-2">
          <p className="rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
            Lease-scoped expenses are supported on the backend, but this form is
            currently focused on organization, building, and unit entry.
          </p>
        </div>
      ) : null}
    </div>
  );
}