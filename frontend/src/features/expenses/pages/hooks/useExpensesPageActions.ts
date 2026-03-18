// # Filename: src/features/expenses/pages/hooks/useExpensesPageActions.ts


import { useCallback, useMemo } from "react";

import { getExpensePageErrorMessage } from "../utils/expensePageErrors";
import {
  useArchiveExpenseMutation,
  useCreateExpenseMutation,
  useUnarchiveExpenseMutation,
  useUpdateExpenseMutation,
} from "../../hooks/useExpenseMutations";
import type {
  CreateExpensePayload,
  ExpenseListItem,
} from "../../api/expensesTypes";
import type { UseExpensesPageStateResult } from "./useExpensesPageState";

/**
 * Input contract for useExpensesPageActions.
 */
interface UseExpensesPageActionsParams {
  pageState: UseExpensesPageStateResult;
}

/**
 * Action contract returned by useExpensesPageActions.
 */
export interface UseExpensesPageActionsResult {
  handleSubmit: (values: CreateExpensePayload) => Promise<void>;
  handleEdit: (expense: ExpenseListItem) => void;
  handleArchive: (expense: ExpenseListItem) => Promise<void>;
  handleUnarchive: (expense: ExpenseListItem) => Promise<void>;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
  isArchiving: boolean;
  isUnarchiving: boolean;
}

/**
 * Composes all mutation-backed page actions for the Expenses page.
 *
 * Responsibilities:
 * - create/update submit handling
 * - edit row selection
 * - archive/unarchive confirmations
 * - submit/loading/error aggregation
 *
 * @param params Hook params.
 * @returns Page action handlers and derived mutation state.
 */
export function useExpensesPageActions({
  pageState,
}: UseExpensesPageActionsParams): UseExpensesPageActionsResult {
  const createExpenseMutation = useCreateExpenseMutation();
  const updateExpenseMutation = useUpdateExpenseMutation();
  const archiveExpenseMutation = useArchiveExpenseMutation();
  const unarchiveExpenseMutation = useUnarchiveExpenseMutation();

  const isSubmitting =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  const submitErrorMessage = useMemo(() => {
    const submitError =
      createExpenseMutation.error ?? updateExpenseMutation.error;

    return submitError
      ? getExpensePageErrorMessage(submitError, "Unable to save expense.")
      : null;
  }, [createExpenseMutation.error, updateExpenseMutation.error]);

  /**
   * Handles create/update form submission.
   *
   * @param values API-ready form payload.
   */
  const handleSubmit = useCallback(
    async (values: CreateExpensePayload) => {
      // # Step 1: Route to update flow when editing an existing expense.
      if (pageState.editingExpenseId) {
        await updateExpenseMutation.mutateAsync({
          expenseId: pageState.editingExpenseId,
          payload: values,
        });
        pageState.resetForm();
        return;
      }

      // # Step 2: Otherwise create a new expense record.
      await createExpenseMutation.mutateAsync(values);
      pageState.resetForm();
    },
    [createExpenseMutation, pageState, updateExpenseMutation],
  );

  /**
   * Handles row edit selection from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleEdit = useCallback(
    (expense: ExpenseListItem) => {
      // # Step 1: Move the page into edit mode.
      pageState.setEditingExpenseId(expense.id);

      // # Step 2: Scroll toward the top/form for smoother workflow.
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [pageState],
  );

  /**
   * Handles archive action from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleArchive = useCallback(
    async (expense: ExpenseListItem) => {
      // # Step 1: Confirm the archive state change.
      const confirmed = window.confirm(
        `Archive expense "${expense.description}"?`,
      );

      if (!confirmed) {
        return;
      }

      // # Step 2: Execute the archive mutation.
      await archiveExpenseMutation.mutateAsync(expense.id);

      // # Step 3: Reset edit mode if the archived record was active in the form.
      if (pageState.editingExpenseId === expense.id) {
        pageState.resetForm();
      }
    },
    [archiveExpenseMutation, pageState],
  );

  /**
   * Handles unarchive action from the expenses table.
   *
   * @param expense Selected expense row.
   */
  const handleUnarchive = useCallback(
    async (expense: ExpenseListItem) => {
      // # Step 1: Confirm the unarchive state change.
      const confirmed = window.confirm(
        `Restore expense "${expense.description}" to active status?`,
      );

      if (!confirmed) {
        return;
      }

      // # Step 2: Execute the unarchive mutation.
      await unarchiveExpenseMutation.mutateAsync(expense.id);
    },
    [unarchiveExpenseMutation],
  );

  return {
    handleSubmit,
    handleEdit,
    handleArchive,
    handleUnarchive,
    isSubmitting,
    submitErrorMessage,
    isArchiving: archiveExpenseMutation.isPending,
    isUnarchiving: unarchiveExpenseMutation.isPending,
  };
}