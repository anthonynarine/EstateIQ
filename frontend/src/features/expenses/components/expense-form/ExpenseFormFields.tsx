// # Filename: src/features/expenses/components/expense-form/ExpenseFormFields.tsx


import type {
  ExpenseCategoryOption,
  ExpenseVendorOption,
} from "../../api/expensesTypes";
import type { ExpenseFormValues } from "./expenseFormTypes";

interface ExpenseFormFieldsProps {
  formValues: ExpenseFormValues;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  updateField: (
    field: keyof ExpenseFormValues,
    value: ExpenseFormValues[keyof ExpenseFormValues],
  ) => void;
}

export default function ExpenseFormFields({
  formValues,
  categories,
  vendors,
  updateField,
}: ExpenseFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2 md:col-span-2">
        <label
          htmlFor="expense-description"
          className="text-sm font-medium text-slate-700"
        >
          Description
        </label>
        <input
          id="expense-description"
          type="text"
          value={formValues.description}
          onChange={(event) =>
            updateField("description", event.target.value)
          }
          placeholder="Ex: Plumbing repair, utility bill, landscaping"
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="expense-amount"
          className="text-sm font-medium text-slate-700"
        >
          Amount
        </label>
        <input
          id="expense-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={formValues.amount}
          onChange={(event) => updateField("amount", event.target.value)}
          placeholder="0.00"
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="expense-date"
          className="text-sm font-medium text-slate-700"
        >
          Expense Date
        </label>
        <input
          id="expense-date"
          type="date"
          value={formValues.expense_date}
          onChange={(event) =>
            updateField("expense_date", event.target.value)
          }
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="expense-category"
          className="text-sm font-medium text-slate-700"
        >
          Category
        </label>
        <select
          id="expense-category"
          value={formValues.category_id ?? ""}
          onChange={(event) =>
            updateField(
              "category_id",
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="expense-vendor"
          className="text-sm font-medium text-slate-700"
        >
          Vendor
        </label>
        <select
          id="expense-vendor"
          value={formValues.vendor_id ?? ""}
          onChange={(event) =>
            updateField(
              "vendor_id",
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Select a vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 md:col-span-2">
        <label
          htmlFor="expense-notes"
          className="text-sm font-medium text-slate-700"
        >
          Notes
        </label>
        <textarea
          id="expense-notes"
          rows={4}
          value={formValues.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Optional internal notes for this expense"
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>
    </div>
  );
}