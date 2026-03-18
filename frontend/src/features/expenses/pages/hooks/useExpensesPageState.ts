// # Filename: src/features/expenses/pages/hooks/useExpensesPageState.ts


import { useCallback, useState } from "react";

/**
 * State contract for the Expenses page orchestration layer.
 */
export interface UseExpensesPageStateResult {
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  selectedCategoryId: number | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedVendorId: number | null;
  setSelectedVendorId: React.Dispatch<React.SetStateAction<number | null>>;
  showArchivedOnly: boolean;
  setShowArchivedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  editingExpenseId: number | null;
  setEditingExpenseId: React.Dispatch<React.SetStateAction<number | null>>;
  resetForm: () => void;
}

/**
 * Owns local UI state for the Expenses page.
 *
 * Responsibilities:
 * - filter input state
 * - archive toggle state
 * - current edit target state
 * - form reset behavior
 *
 * @returns Expenses page state and setters.
 */
export function useExpensesPageState(): UseExpensesPageStateResult {
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  /**
   * Resets the page form back to create mode.
   */
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