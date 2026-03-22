// # Filename: src/features/expenses/components/expense-form/expenseFormTypes.ts


export interface ExpenseFormValues {
  description: string;
  amount: string;
  expense_date: string;
  notes: string;
  category_id: number | null;
  vendor_id: number | null;
}