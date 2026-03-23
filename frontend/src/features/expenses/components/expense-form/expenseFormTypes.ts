// # Filename: src/features/expenses/components/expense-form/expenseFormTypes.ts
// ✅ New Code

import type { ExpenseScope } from "../../api/expensesTypes";

export interface ExpenseFormValues {
  description: string;
  amount: string;
  expense_date: string;
  notes: string;
  category_id: number | null;
  vendor_id: number | null;

  /**
   * Scope-aware expense ownership.
   *
   * Optional at the type level for backward compatibility while the
   * rest of the form utilities/page wiring is being upgraded.
   */
  scope?: ExpenseScope;
  building_id?: number | null;
  unit_id?: number | null;
  lease_id?: number | null;
}