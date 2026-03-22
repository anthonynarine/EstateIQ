// # Filename: src/features/expenses/hooks/useExpenseMutations.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expenseQueryKeys } from "../api/expenseQueryKeys";
import {
  archiveExpense,
  createExpense,
  unarchiveExpense,
  updateExpense,
} from "../api/expensesWriteApi";
import type {
  CreateExpensePayload,
  EntityId,
  ExpenseDetail,
  UpdateExpensePayload,
} from "../api/expensesTypes";

/**
 * Shared helper to invalidate expense-related caches after a mutation.
 *
 * We invalidate:
 * - expense lists
 * - expense reporting surfaces
 * - the specific expense detail record when applicable
 *
 * We do not broadly invalidate unrelated feature slices.
 *
 * @param queryClient TanStack Query client instance.
 * @param expenseId Optional expense primary key for detail invalidation.
 */
async function invalidateExpenseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  expenseId?: EntityId,
): Promise<void> {
  // # Step 1: Invalidate all expense list queries.
  await queryClient.invalidateQueries({
    queryKey: expenseQueryKeys.lists(),
  });

  // # Step 2: Invalidate all expense reporting queries.
  await queryClient.invalidateQueries({
    queryKey: expenseQueryKeys.reporting(),
  });

  // # Step 3: Invalidate the specific detail query when an ID is available.
  if (expenseId) {
    await queryClient.invalidateQueries({
      queryKey: expenseQueryKeys.detail(expenseId),
    });
  }
}

/**
 * Mutation hook for creating a new expense.
 *
 * This mutation invalidates expense lists and reporting after creation so
 * the page reflects the new record and updated aggregate totals.
 *
 * @returns TanStack mutation result for creating an expense.
 */
export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => createExpense(payload),
    onSuccess: async (createdExpense: ExpenseDetail) => {
      // # Step 1: Invalidate list and reporting caches.
      await invalidateExpenseCaches(queryClient, createdExpense.id);
    },
  });
}

/**
 * Input shape for the update expense mutation.
 */
export interface UpdateExpenseMutationInput {
  expenseId: EntityId;
  payload: UpdateExpensePayload;
}

/**
 * Mutation hook for updating an existing expense.
 *
 * This uses PATCH semantics through the write API layer and invalidates the
 * list, reporting, and matching detail cache on success.
 *
 * @returns TanStack mutation result for updating an expense.
 */
export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, payload }: UpdateExpenseMutationInput) =>
      updateExpense(expenseId, payload),
    onSuccess: async (updatedExpense: ExpenseDetail) => {
      // # Step 1: Invalidate caches affected by the updated record.
      await invalidateExpenseCaches(queryClient, updatedExpense.id);
    },
  });
}

/**
 * Mutation hook for archiving an expense.
 *
 * Archive is a sensitive state change because it affects both operational
 * lists and reporting totals.
 *
 * @returns TanStack mutation result for archiving an expense.
 */
export function useArchiveExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: EntityId) => archiveExpense(expenseId),
    onSuccess: async (archivedExpense: ExpenseDetail) => {
      // # Step 1: Invalidate caches affected by archive state change.
      await invalidateExpenseCaches(queryClient, archivedExpense.id);
    },
  });
}

/**
 * Mutation hook for unarchiving an expense.
 *
 * Unarchive restores a record to active operational visibility and reporting.
 *
 * @returns TanStack mutation result for unarchiving an expense.
 */
export function useUnarchiveExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: EntityId) => unarchiveExpense(expenseId),
    onSuccess: async (restoredExpense: ExpenseDetail) => {
      // # Step 1: Invalidate caches affected by unarchive state change.
      await invalidateExpenseCaches(queryClient, restoredExpense.id);
    },
  });
}

/**
 * Aggregated mutation contract for the Expenses page orchestration layer.
 *
 * Why this exists:
 * The page should not need to manually wire four separate mutation hooks
 * every time it wants to support create, edit, archive, and restore flows.
 *
 * This hook keeps the individual mutation hooks reusable while also giving
 * the page a clean, production-friendly orchestration surface.
 */
export interface ExpenseMutationsBundle {
  createExpense: (payload: CreateExpensePayload) => Promise<ExpenseDetail>;
  updateExpense: (
    input: UpdateExpenseMutationInput,
  ) => Promise<ExpenseDetail>;
  archiveExpense: (expenseId: EntityId) => Promise<ExpenseDetail>;
  unarchiveExpense: (expenseId: EntityId) => Promise<ExpenseDetail>;
  isCreating: boolean;
  isUpdating: boolean;
  isArchiving: boolean;
  isUnarchiving: boolean;
  isSubmitting: boolean;
  createError: Error | null;
  updateError: Error | null;
  archiveError: Error | null;
  unarchiveError: Error | null;
}

/**
 * Bundles all expense mutations into one page-friendly orchestration hook.
 *
 * This is especially useful for:
 * - ExpensesPage
 * - useExpensesPageActions
 * - table row action handlers
 * - create/edit panel submit handlers
 *
 * @returns Aggregated mutation actions and state flags.
 */
export function useExpenseMutations(): ExpenseMutationsBundle {
  const createMutation = useCreateExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const archiveMutation = useArchiveExpenseMutation();
  const unarchiveMutation = useUnarchiveExpenseMutation();

  return {
    // # Step 1: Expose promise-based mutation executors.
    createExpense: async (payload: CreateExpensePayload) =>
      await createMutation.mutateAsync(payload),

    updateExpense: async (input: UpdateExpenseMutationInput) =>
      await updateMutation.mutateAsync(input),

    archiveExpense: async (expenseId: EntityId) =>
      await archiveMutation.mutateAsync(expenseId),

    unarchiveExpense: async (expenseId: EntityId) =>
      await unarchiveMutation.mutateAsync(expenseId),

    // # Step 2: Expose operation-specific loading state.
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isUnarchiving: unarchiveMutation.isPending,

    // # Step 3: Expose aggregate submit state for form/action locking.
    isSubmitting:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending ||
      unarchiveMutation.isPending,

    // # Step 4: Expose typed errors for page-level messaging.
    createError: (createMutation.error as Error | null) ?? null,
    updateError: (updateMutation.error as Error | null) ?? null,
    archiveError: (archiveMutation.error as Error | null) ?? null,
    unarchiveError: (unarchiveMutation.error as Error | null) ?? null,
  };
}