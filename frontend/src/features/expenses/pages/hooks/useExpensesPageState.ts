// # Filename: src/features/expenses/pages/hooks/useExpensesPageState.ts

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * State contract for the Expenses page orchestration layer.
 */
export interface UseExpensesPageStateResult {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  selectedCategoryId: number | null;
  setSelectedCategoryId: Dispatch<SetStateAction<number | null>>;
  selectedVendorId: number | null;
  setSelectedVendorId: Dispatch<SetStateAction<number | null>>;
  showArchivedOnly: boolean;
  setShowArchivedOnly: Dispatch<SetStateAction<boolean>>;
  editingExpenseId: number | null;
  setEditingExpenseId: Dispatch<SetStateAction<number | null>>;
  resetForm: () => void;
}


export function useExpensesPageState(): UseExpensesPageStateResult {
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    // # Step 1: Clear the active edit target.
    setEditingExpenseId(null);
  }, []);

  return {
    searchInput,
    setSearchInput,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedVendorId,
    setSelectedVendorId,
    showArchivedOnly,
    setShowArchivedOnly,
    editingExpenseId,
    setEditingExpenseId,
    resetForm,
  };
}