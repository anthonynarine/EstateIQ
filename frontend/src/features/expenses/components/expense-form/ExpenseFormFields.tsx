// # Filename: src/features/expenses/components/expense-form/ExpenseFormFields.tsx
// ✅ New Code

import { useMemo, type ReactNode } from "react";
import { ChevronDown, FileText, Plus } from "lucide-react";

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
  onOpenNotesModal: () => void;
  isAddVendorDisabled?: boolean;
}

interface FieldHeaderProps {
  htmlFor: string;
  label: string;
  trailing?: ReactNode;
}

function FieldHeader({
  htmlFor,
  label,
  trailing = null,
}: FieldHeaderProps) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500"
      >
        {label}
      </label>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function SelectChevron() {
  return (
    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
  );
}

export default function ExpenseFormFields({
  formValues,
  categories,
  vendors,
  buildingOptions = [],
  unitOptions = [],
  updateField,
  onAddVendorClick,
  onOpenNotesModal,
  isAddVendorDisabled = false,
}: ExpenseFormFieldsProps) {
  const selectedScope: ExpenseScope = formValues.scope ?? "organization";
  const hasVendors = vendors.length > 0;
  const showUnitField = selectedScope === "unit";
  const hasNotes = Boolean(formValues.notes?.trim());

  const availableUnits = useMemo(() => {
    // # Step 1: Only resolve units when the form is in unit scope.
    if (!showUnitField) {
      return [];
    }

    // # Step 2: No building means no scoped unit list.
    if (!formValues.building_id) {
      return [];
    }

    // # Step 3: Filter units against the selected building when the API
    // provides building linkage. Some option payloads may already be pre-scoped.
    return unitOptions.filter((unit) => {
      if (unit.building_id === undefined || unit.building_id === null) {
        return true;
      }

      return unit.building_id === formValues.building_id;
    });
  }, [formValues.building_id, showUnitField, unitOptions]);

  const baseFieldClassName =
    "w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white placeholder:text-neutral-500 outline-none ring-1 ring-white/[0.04] transition focus:border-cyan-400/25 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-neutral-500";

  const textInputClassName = `${baseFieldClassName} h-12`;
  const selectClassName =
    `${baseFieldClassName} h-12 appearance-none bg-neutral-950 pr-12`;
  const dateInputClassName =
    `${baseFieldClassName} h-12 bg-white/[0.07] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90`;
  const optionClassName = "bg-neutral-950 text-white";

  const actionButtonClassName =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-100 ring-1 ring-white/[0.04] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

  const handleScopeChange = (nextScope: ExpenseScope) => {
    // # Step 1: Update the selected scope.
    updateField("scope", nextScope);

    // # Step 2: Reset incompatible scope references so the form stays
    // deterministic as the user moves between organization/building/unit.
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
    }
  };

  const handleBuildingChange = (nextBuildingId: number | null) => {
    // # Step 1: Persist the newly selected building.
    updateField("building_id", nextBuildingId);

    // # Step 2: Remove stale unit state when the building changes.
    if (!nextBuildingId) {
      updateField("unit_id", null);
      return;
    }

    const nextAvailableUnits = unitOptions.filter((unit) => {
      if (unit.building_id === undefined || unit.building_id === null) {
        return true;
      }

      return unit.building_id === nextBuildingId;
    });

    const selectedUnitStillMatches = nextAvailableUnits.some(
      (unit) => unit.id === formValues.unit_id,
    );

    if (!selectedUnitStillMatches) {
      updateField("unit_id", null);
    }
  };

  const getUnitLabel = (unit: ExpenseUnitOption): string => {
    return unit.name ?? unit.unit_number ?? `Unit #${unit.id}`;
  };

  const vendorPlaceholder = hasVendors
    ? "Select a vendor"
    : "No vendors yet — add one";

  const buildingPlaceholder =
    buildingOptions.length > 0 ? "Select a building" : "No buildings available";

  const unitPlaceholder = !formValues.building_id
    ? "Select a building first"
    : availableUnits.length > 0
      ? "Select a unit"
      : "No units available";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <FieldHeader htmlFor="expense-scope" label="Scope" />

          <div className="relative">
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

            <SelectChevron />
          </div>
        </div>

        <div>
          <FieldHeader htmlFor="expense-date" label="Expense Date" />

          <div className="relative">
            <input
              id="expense-date"
              type="date"
              value={formValues.expense_date}
              onChange={(event) =>
                updateField("expense_date", event.target.value)
              }
              className={dateInputClassName}
            />
          </div>
        </div>
      </div>

      {selectedScope === "building" ? (
        <div className="grid grid-cols-1 gap-3">
          <div>
            <FieldHeader htmlFor="expense-building" label="Building" />

            <div className="relative">
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
                  {buildingPlaceholder}
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

              <SelectChevron />
            </div>
          </div>
        </div>
      ) : null}

      {selectedScope === "unit" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <FieldHeader htmlFor="expense-building" label="Building" />

            <div className="relative">
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
                  {buildingPlaceholder}
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

              <SelectChevron />
            </div>
          </div>

          <div>
            <FieldHeader htmlFor="expense-unit" label="Unit" />

            <div className="relative">
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
                  {unitPlaceholder}
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

              <SelectChevron />
            </div>
          </div>
        </div>
      ) : null}

      {selectedScope === "lease" ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
          Lease-scoped expenses are supported on the backend, but this form is
          currently optimized for organization, building, and unit entry.
        </div>
      ) : null}

      <div>
        <FieldHeader htmlFor="expense-description" label="Description" />

        <div className="relative">
          <input
            id="expense-description"
            type="text"
            value={formValues.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Ex: Plumbing repair, utility bill, landscaping"
            className={textInputClassName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <FieldHeader htmlFor="expense-amount" label="Amount" />

          <div className="relative">
            <input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formValues.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              placeholder="0.00"
              className={textInputClassName}
            />
          </div>
        </div>

        <div>
          <FieldHeader htmlFor="expense-category" label="Category" />

          <div className="relative">
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

            <SelectChevron />
          </div>
        </div>
      </div>

      <div>
        <FieldHeader
          htmlFor="expense-vendor"
          label="Vendor"
          trailing={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenNotesModal}
                className={actionButtonClassName}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{hasNotes ? "Edit note" : "Add note"}</span>
              </button>

              <button
                type="button"
                onClick={onAddVendorClick}
                disabled={isAddVendorDisabled}
                className={actionButtonClassName}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add vendor</span>
              </button>
            </div>
          }
        />

        <div className="relative">
          <select
            id="expense-vendor"
            value={formValues.vendor_id ?? ""}
            onChange={(event) =>
              updateField(
                "vendor_id",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={!hasVendors && !formValues.vendor_id}
            className={selectClassName}
          >
            <option value="" className={optionClassName}>
              {vendorPlaceholder}
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

          <SelectChevron />
        </div>
      </div>
    </div>
  );
}