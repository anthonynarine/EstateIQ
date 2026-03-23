// # Filename: src/features/expenses/pages/hooks/useExpensesPageState.ts
// ✅ New Code

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { ExpenseScope } from "../../api/expensesTypes";

/**
 * State contract for the Expenses page orchestration layer.
 *
 * This hook intentionally owns only page-local UI state:
 * - filter state
 * - edit target state
 * - row processing state
 * - form remount identity
 * - records pagination state
 *
 * Data fetching and mutations stay in dedicated hooks.
 */
export interface UseExpensesPageStateResult {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;

  selectedScope: ExpenseScope | null;
  setSelectedScope: Dispatch<SetStateAction<ExpenseScope | null>>;

  selectedCategoryId: number | null;
  setSelectedCategoryId: Dispatch<SetStateAction<number | null>>;

  selectedVendorId: number | null;
  setSelectedVendorId: Dispatch<SetStateAction<number | null>>;

  selectedBuildingId: number | null;
  setSelectedBuildingId: Dispatch<SetStateAction<number | null>>;

  selectedUnitId: number | null;
  setSelectedUnitId: Dispatch<SetStateAction<number | null>>;

  showArchivedOnly: boolean;
  setShowArchivedOnly: Dispatch<SetStateAction<boolean>>;

  editingExpenseId: number | null;
  processingExpenseId: number | null;

  formMode: "create" | "edit";
  formInstanceKey: string;

  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;

  startEditing: (expenseId: number) => void;
  stopEditing: () => void;
  resetForm: () => void;

  startProcessingExpense: (expenseId: number) => void;
  stopProcessingExpense: () => void;
}

const EXPENSES_RECORDS_PAGE_SIZE = 6;

/**
 * Manages page-local UI state for the Expenses page.
 *
 * Why this hook exists:
 * The page needs a small orchestration layer that can coordinate:
 * - table actions
 * - form mode switching
 * - archived filter behavior
 * - row-level loading state during archive/restore
 * - records pagination
 *
 * Important design note:
 * `formInstanceKey` is derived from the active mode and edit target.
 * The parent page should pass this key to the form panel so React
 * remounts the form when switching between create/edit flows.
 *
 * @returns Expenses page state and orchestration helpers.
 */
export function useExpensesPageState(): UseExpensesPageStateResult {
  const [searchInput, setSearchInput] = useState("");
  const [selectedScope, setSelectedScope] = useState<ExpenseScope | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
    null,
  );
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [processingExpenseId, setProcessingExpenseId] = useState<number | null>(
    null,
  );

  // # Step 1: Add local pagination state for the records workspace.
  const [page, setPage] = useState<number>(1);
  const pageSize = EXPENSES_RECORDS_PAGE_SIZE;

  const formMode = useMemo<"create" | "edit">(() => {
    return editingExpenseId ? "edit" : "create";
  }, [editingExpenseId]);

  const formInstanceKey = useMemo(() => {
    return editingExpenseId
      ? `expense-form-edit-${editingExpenseId}`
      : "expense-form-create";
  }, [editingExpenseId]);

  const startEditing = useCallback((expenseId: number) => {
    // # Step 1: Enter edit mode for the selected record.
    setEditingExpenseId(expenseId);
  }, []);

  const stopEditing = useCallback(() => {
    // # Step 1: Return the page to create mode.
    setEditingExpenseId(null);
  }, []);

  const resetForm = useCallback(() => {
    // # Step 1: Clear the active edit target.
    setEditingExpenseId(null);
  }, []);

  const startProcessingExpense = useCallback((expenseId: number) => {
    // # Step 1: Track the row currently being archived/restored.
    setProcessingExpenseId(expenseId);
  }, []);

  const stopProcessingExpense = useCallback(() => {
    // # Step 1: Clear row-level processing state.
    setProcessingExpenseId(null);
  }, []);

  return {
    searchInput,
    setSearchInput,

    selectedScope,
    setSelectedScope,

    selectedCategoryId,
    setSelectedCategoryId,

    selectedVendorId,
    setSelectedVendorId,

    selectedBuildingId,
    setSelectedBuildingId,

    selectedUnitId,
    setSelectedUnitId,

    showArchivedOnly,
    setShowArchivedOnly,

    editingExpenseId,
    processingExpenseId,

    formMode,
    formInstanceKey,

    page,
    setPage,
    pageSize,

    startEditing,
    stopEditing,
    resetForm,

    startProcessingExpense,
    stopProcessingExpense,
  };
}