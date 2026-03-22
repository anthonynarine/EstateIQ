// # Filename: src/features/expenses/pages/hooks/useExpensesPageActions.ts

import { useCallback, useMemo } from "react";

import { useExpenseMutations } from "../../hooks/useExpenseMutations";
import type {
  CreateExpensePayload,
  ExpenseListItem,
  UpdateExpensePayload,
} from "../../api/expensesTypes";
import { getExpensePageErrorMessage } from "../utils/expensePageErrors";
import type { UseExpensesPageStateResult } from "./useExpensesPageState";

type ExpenseFormSubmitPayload =
  | CreateExpensePayload
  | UpdateExpensePayload;

/**
 * Input contract for `useExpensesPageActions`.
 */
interface UseExpensesPageActionsParams {
  pageState: UseExpensesPageStateResult;
}

/**
 * Action contract returned by `useExpensesPageActions`.
 */
export interface UseExpensesPageActionsResult {
  handleSubmit: (values: ExpenseFormSubmitPayload) => Promise<void>;
  handleEdit: (expense: ExpenseListItem) => void;
  handleArchive: (expense: ExpenseListItem) => Promise<void>;
  handleUnarchive: (expense: ExpenseListItem) => Promise<void>;
  handleCancelEdit: () => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
  isArchiving: boolean;
  isUnarchiving: boolean;
}

/**
 * Builds a human-readable expense label for user-facing messaging.
 *
 * Some expense rows may not have a populated `description` field in every
 * context. This helper ensures confirms and action prompts always show a
 * stable label instead of "undefined".
 *
 * @param expense Selected expense row.
 * @returns Best available display label for the expense.
 */
function getExpenseDisplayLabel(expense: ExpenseListItem): string {
  return expense.description?.trim() || expense.title?.trim() || `#${expense.id}`;
}

/**
 * Composes mutation-backed page actions for the Expenses page.
 *
 * Responsibilities:
 * - route form submit into create vs update
 * - enter and exit edit mode
 * - archive and restore records
 * - coordinate row-level processing state for the table
 * - expose a page-friendly loading and error surface
 *
 * Important design note:
 * This hook does not own query data or local page state.
 * It only coordinates mutations with `useExpensesPageState`.
 *
 * @param params Hook params.
 * @returns Page action handlers and derived mutation state.
 */
export function useExpensesPageActions({
  pageState,
}: UseExpensesPageActionsParams): UseExpensesPageActionsResult {
  const {
    createExpense,
    updateExpense,
    archiveExpense,
    unarchiveExpense,
    isSubmitting,
    isArchiving,
    isUnarchiving,
    createError,
    updateError,
  } = useExpenseMutations();

  const submitErrorMessage = useMemo(() => {
    const submitError = createError ?? updateError;

    return submitError
      ? getExpensePageErrorMessage(submitError, "Unable to save expense.")
      : null;
  }, [createError, updateError]);

  /**
   * Handles create/update form submission.
   *
   * The form hook already builds the correct payload shape based on mode.
   * This page action hook simply routes the payload to the correct mutation.
   *
   * @param values API-ready create or update payload from the form layer.
   */
  const handleSubmit = useCallback(
    async (values: ExpenseFormSubmitPayload) => {
      // # Step 1: Route to update flow when an edit target exists.
      if (pageState.editingExpenseId) {
        await updateExpense({
          expenseId: pageState.editingExpenseId,
          payload: values as UpdateExpensePayload,
        });

        // # Step 2: Exit edit mode after a successful update.
        pageState.resetForm();
        return;
      }

      // # Step 3: Otherwise create a new expense record.
      await createExpense(values as CreateExpensePayload);

      // # Step 4: Reset form mode after successful create.
      pageState.resetForm();
    },
    [createExpense, pageState, updateExpense],
  );

  /**
   * Handles row edit selection from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleEdit = useCallback(
    (expense: ExpenseListItem) => {
      // # Step 1: Move the page into edit mode for the selected record.
      pageState.startEditing(expense.id);

      // # Step 2: Scroll toward the form for a smoother edit workflow.
      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
    [pageState],
  );

  /**
   * Cancels the current edit session and returns the page to create mode.
   */
  const handleCancelEdit = useCallback(() => {
    // # Step 1: Exit edit mode.
    pageState.stopEditing();
  }, [pageState]);

  /**
   * Handles archive action from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleArchive = useCallback(
    async (expense: ExpenseListItem) => {
      const expenseLabel = getExpenseDisplayLabel(expense);

      // # Step 1: Confirm the archive state change.
      const confirmed = window.confirm(`Archive expense "${expenseLabel}"?`);

      if (!confirmed) {
        return;
      }

      // # Step 2: Mark the row as being processed.
      pageState.startProcessingExpense(expense.id);

      try {
        // # Step 3: Execute the archive mutation.
        await archiveExpense(expense.id);

        // # Step 4: Exit edit mode if the archived record is active in the form.
        if (pageState.editingExpenseId === expense.id) {
          pageState.resetForm();
        }
      } finally {
        // # Step 5: Always clear row processing state.
        pageState.stopProcessingExpense();
      }
    },
    [archiveExpense, pageState],
  );

  /**
   * Handles unarchive action from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleUnarchive = useCallback(
    async (expense: ExpenseListItem) => {
      const expenseLabel = getExpenseDisplayLabel(expense);

      // # Step 1: Confirm the restore action.
      const confirmed = window.confirm(
        `Restore expense "${expenseLabel}" to active status?`,
      );

      if (!confirmed) {
        return;
      }

      // # Step 2: Mark the row as being processed.
      pageState.startProcessingExpense(expense.id);

      try {
        // # Step 3: Execute the restore mutation.
        await unarchiveExpense(expense.id);
      } finally {
        // # Step 4: Always clear row processing state.
        pageState.stopProcessingExpense();
      }
    },
    [pageState, unarchiveExpense],
  );

  return {
    handleSubmit,
    handleEdit,
    handleArchive,
    handleUnarchive,
    handleCancelEdit,
    isSubmitting,
    submitErrorMessage,
    isArchiving,
    isUnarchiving,
  };
}