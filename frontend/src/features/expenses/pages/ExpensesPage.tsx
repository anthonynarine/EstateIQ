// # Filename: src/features/expenses/pages/ExpensesPage.tsx

// ✅ New Code

import { useCallback, useMemo, useState } from "react";

import ExpenseFormPanel, {
  type ExpenseFormValues,
} from "../components/ExpenseFormPanel";
import ExpenseReportingSection from "../components/ExpenseReportingSection/ExpenseReportingSection";
import ExpensesTable from "../components/ExpensesTable";
import {
  useExpenseByBuilding,
  useExpenseByCategory,
  useExpenseCategories,
  useExpenseDashboard,
  useExpenseDetail,
  useExpenseList,
  useExpenseMonthlyTrend,
  useExpenseVendors,
} from "../hooks/useExpenseQueries";
import {
  useArchiveExpenseMutation,
  useCreateExpenseMutation,
  useUnarchiveExpenseMutation,
  useUpdateExpenseMutation,
} from "../hooks/useExpenseMutations";
import type {
  CreateExpensePayload,
  ExpenseListFilters,
  ExpenseListItem,
} from "../api/expensesTypes";

/**
 * Safely extracts a user-friendly error message from unknown error input.
 *
 * @param error Unknown thrown value from React Query or mutation handlers.
 * @param fallbackMessage Fallback message when extraction fails.
 * @returns Readable error string.
 */
function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  // # Step 1: Handle missing errors.
  if (!error) {
    return fallbackMessage;
  }

  // # Step 2: Handle standard Error objects.
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // # Step 3: Handle Axios-like nested response messages.
  const maybeError = error as {
    response?: {
      data?: {
        detail?: string;
        message?: string;
        non_field_errors?: string[];
      };
    };
  };

  const detailMessage = maybeError.response?.data?.detail;
  if (detailMessage) {
    return detailMessage;
  }

  const apiMessage = maybeError.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  const nonFieldErrors = maybeError.response?.data?.non_field_errors;
  if (nonFieldErrors?.length) {
    return nonFieldErrors.join(", ");
  }

  return fallbackMessage;
}

/**
 * Maps an expense record into ExpenseFormPanel initial values.
 *
 * @param expense Expense record from list/detail query.
 * @returns Form-compatible initial values.
 */
function mapExpenseToFormValues(
  expense: Partial<ExpenseListItem> | null | undefined,
): Partial<ExpenseFormValues> {
  // # Step 1: Guard against missing expense input.
  if (!expense) {
    return {};
  }

  // # Step 2: Return only the fields currently owned by the form.
  return {
    description: expense.description ?? "",
    amount:
      expense.amount !== undefined && expense.amount !== null
        ? String(expense.amount)
        : "",
    expense_date: expense.expense_date ?? "",
    notes: expense.notes ?? "",
    category_id: expense.category?.id ?? null,
    vendor_id: expense.vendor?.id ?? null,
  };
}

/**
 * ExpensesPage
 *
 * Feature orchestration page for the Expenses vertical slice.
 *
 * Responsibilities:
 * - own list and reporting filter state
 * - coordinate expense queries and mutations
 * - manage create/edit form mode
 * - compose the reporting section, form panel, and expenses table
 *
 * Non-responsibilities:
 * - raw API calls
 * - row/table rendering details
 * - form field management
 * - reporting data formatting
 *
 * @returns Expenses feature page.
 */
export default function ExpensesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  /**
   * Expense list filters used by the CRUD list surface.
   */
  const listFilters = useMemo<ExpenseListFilters>(() => {
    return {
      search: searchInput.trim() || undefined,
      category_id: selectedCategoryId,
      vendor_id: selectedVendorId,
      is_archived: showArchivedOnly ? true : undefined,
    };
  }, [searchInput, selectedCategoryId, selectedVendorId, showArchivedOnly]);

  /**
   * Reporting filters intentionally exclude archive-state toggling because
   * archived expenses are excluded by default at the reporting API layer.
   */
  const reportingFilters = useMemo<ExpenseListFilters>(() => {
    return {
      category_id: selectedCategoryId,
      vendor_id: selectedVendorId,
    };
  }, [selectedCategoryId, selectedVendorId]);

  const expenseListQuery = useExpenseList(listFilters);
  const categoriesQuery = useExpenseCategories();
  const vendorsQuery = useExpenseVendors();

  const expenseDetailQuery = useExpenseDetail(editingExpenseId);

  const dashboardQuery = useExpenseDashboard(reportingFilters);
  const monthlyTrendQuery = useExpenseMonthlyTrend(reportingFilters);
  const byCategoryQuery = useExpenseByCategory(reportingFilters);
  const byBuildingQuery = useExpenseByBuilding(reportingFilters);

  const createExpenseMutation = useCreateExpenseMutation();
  const updateExpenseMutation = useUpdateExpenseMutation();
  const archiveExpenseMutation = useArchiveExpenseMutation();
  const unarchiveExpenseMutation = useUnarchiveExpenseMutation();

  /**
   * Derived page mode based on whether an expense is currently selected for edit.
   */
  const formMode = editingExpenseId ? "edit" : "create";

  /**
   * Current form initial values.
   *
   * Prefer the detail query when editing so the form uses the freshest data.
   */
  const formInitialValues = useMemo<Partial<ExpenseFormValues>>(() => {
    if (!editingExpenseId) {
      return {};
    }

    return mapExpenseToFormValues(
      (expenseDetailQuery.data as Partial<ExpenseListItem> | undefined) ?? null,
    );
  }, [editingExpenseId, expenseDetailQuery.data]);

  /**
   * Combined reporting loading state.
   */
  const isReportingLoading =
    dashboardQuery.isLoading ||
    monthlyTrendQuery.isLoading ||
    byCategoryQuery.isLoading ||
    byBuildingQuery.isLoading;

  /**
   * Combined reporting error message.
   */
  const reportingErrorMessage = useMemo(() => {
    const firstError =
      dashboardQuery.error ??
      monthlyTrendQuery.error ??
      byCategoryQuery.error ??
      byBuildingQuery.error;

    return firstError
      ? getErrorMessage(firstError, "Unable to load expense reporting.")
      : null;
  }, [
    dashboardQuery.error,
    monthlyTrendQuery.error,
    byCategoryQuery.error,
    byBuildingQuery.error,
  ]);

  /**
   * Combined submit state for the form.
   */
  const isSubmitting =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  /**
   * Combined submit error message for the form.
   */
  const submitErrorMessage = useMemo(() => {
    const submitError =
      createExpenseMutation.error ?? updateExpenseMutation.error;

    return submitError
      ? getErrorMessage(submitError, "Unable to save expense.")
      : null;
  }, [createExpenseMutation.error, updateExpenseMutation.error]);

  /**
   * Resets the form back to create mode.
   */
  const resetForm = useCallback(() => {
    // # Step 1: Clear the active edit target.
    setEditingExpenseId(null);
  }, []);

  /**
   * Handles create/update form submission.
   *
   * @param values API-ready form payload from the form panel.
   */
  const handleSubmit = useCallback(
    async (values: CreateExpensePayload) => {
      // # Step 1: Route to update when an edit target exists.
      if (editingExpenseId) {
        await updateExpenseMutation.mutateAsync({
          expenseId: editingExpenseId,
          payload: values,
        });
        resetForm();
        return;
      }

      // # Step 2: Otherwise create a new expense record.
      await createExpenseMutation.mutateAsync(values);
      resetForm();
    },
    [
      createExpenseMutation,
      editingExpenseId,
      resetForm,
      updateExpenseMutation,
    ],
  );

  /**
   * Handles row edit selection from the table.
   *
   * @param expense Selected expense row.
   */
  const handleEdit = useCallback((expense: ExpenseListItem) => {
    // # Step 1: Move the page into edit mode using the selected row ID.
    setEditingExpenseId(expense.id);

    // # Step 2: Scroll toward the form for a smoother workflow.
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  /**
   * Handles archive action from a row.
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

      // # Step 3: Reset edit mode if the archived item was being edited.
      if (editingExpenseId === expense.id) {
        resetForm();
      }
    },
    [archiveExpenseMutation, editingExpenseId, resetForm],
  );

  /**
   * Handles unarchive action from a row.
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

  const expenses = expenseListQuery.data?.items ?? [];
  const totalExpenseCount = expenseListQuery.data?.count ?? expenses.length;
  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const listErrorMessage = expenseListQuery.error
    ? getErrorMessage(expenseListQuery.error, "Unable to load expenses.")
    : null;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Manage operational expenses, keep category and vendor context
              attached, and review reporting without mixing aggregate views into
              the record lifecycle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editingExpenseId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                New Expense
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-2 xl:col-span-2">
            <label
              htmlFor="expense-search"
              className="text-sm font-medium text-slate-700"
            >
              Search
            </label>
            <input
              id="expense-search"
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search description or notes"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-filter-category"
              className="text-sm font-medium text-slate-700"
            >
              Category Filter
            </label>
            <select
              id="expense-filter-category"
              value={selectedCategoryId ?? ""}
              onChange={(event) =>
                setSelectedCategoryId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="expense-filter-vendor"
              className="text-sm font-medium text-slate-700"
            >
              Vendor Filter
            </label>
            <select
              id="expense-filter-vendor"
              value={selectedVendorId ?? ""}
              onChange={(event) =>
                setSelectedVendorId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showArchivedOnly}
                onChange={(event) => setShowArchivedOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show archived only
            </label>

            <span className="text-sm text-slate-500">
              Records: {totalExpenseCount}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Archived expenses are excluded from reporting by default.
          </p>
        </div>
      </section>

      <ExpenseReportingSection
        dashboard={dashboardQuery.data}
        monthlyTrend={monthlyTrendQuery.data}
        byCategory={byCategoryQuery.data}
        byBuilding={byBuildingQuery.data}
        isLoading={isReportingLoading}
        errorMessage={reportingErrorMessage}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <ExpenseFormPanel
          mode={formMode}
          initialValues={formInitialValues}
          categories={categories}
          vendors={vendors}
          isSubmitting={isSubmitting || expenseDetailQuery.isLoading}
          submitError={submitErrorMessage}
          onSubmit={handleSubmit}
          onCancel={formMode === "edit" ? resetForm : undefined}
        />

        <div className="flex flex-col gap-4">
          {listErrorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {listErrorMessage}
            </div>
          ) : null}

          {categoriesQuery.error || vendorsQuery.error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
              Lookup data failed to fully load. Expense create/edit may be
              limited until category and vendor queries succeed.
            </div>
          ) : null}

          {expenseListQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">Loading expenses...</p>
            </div>
          ) : (
            <ExpensesTable
              expenses={expenses}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              isArchiving={archiveExpenseMutation.isPending}
              isUnarchiving={unarchiveExpenseMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}