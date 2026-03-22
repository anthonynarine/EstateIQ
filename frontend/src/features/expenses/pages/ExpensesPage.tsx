// # Filename: src/features/expenses/pages/ExpensesPage.tsx


import { useEffect, useMemo, useState } from "react";

import ExpenseReportingSection from "../components/ExpenseReportingSection";
import ExpensesContent from "./components/ ExpensesContent";
import ExpensesFiltersBar from "./components/ExpensesFiltersBar";
import ExpensesFormSection from "./components/Reporting";
import ExpensesHeader from "./components/ExpensesHeader";
import ExpensesTableSection from "./components/ExpensesTableSection";
import type { ExpensesWorkspaceTab } from "../components/ExpensesWorkspaceTabs";
import { useExpensesPageActions } from "./hooks/useExpensesPageActions";
import { useExpensesPageData } from "./hooks/useExpensesPageData";
import { useExpensesPageState } from "./hooks/useExpensesPageState";

const PAGE_CONTAINER_CLASS = "flex flex-col gap-6";
const WORKSPACE_SECTION_CLASS = "flex flex-col gap-6";

/**
 * Top-level orchestration page for the Expenses slice.
 *
 * Responsibilities:
 * - own page-local workspace state
 * - compose page state, query data, and mutation actions
 * - route the user between Records and Reporting workspaces
 * - keep orchestration here and feature rendering in child components
 *
 * Workspace model:
 * - records = operational workflow
 * - reporting = analytical workflow
 *
 * Current pagination model:
 * - client-side over the filtered records list
 * - fixed page size of 6
 *
 * @returns Expenses page UI.
 */
export default function ExpensesPage() {
  // # Step 1: Build page-local UI state.
  const pageState = useExpensesPageState();

  // # Step 2: Build query-backed page data from page state.
  const pageData = useExpensesPageData(pageState);

  // # Step 3: Build mutation-backed page actions.
  const pageActions = useExpensesPageActions({
    pageState,
  });

  // # Step 4: Keep workspace selection local to the page.
  const [activeWorkspace, setActiveWorkspace] =
    useState<ExpensesWorkspaceTab>("records");

  // # Step 5: Destructure stable page-state fields for pagination/effects.
  const {
    searchInput,
    selectedCategoryId,
    selectedVendorId,
    showArchivedOnly,
    editingExpenseId,
    processingExpenseId,
    formInstanceKey,
    page,
    setPage,
    pageSize,
  } = pageState;

  const totalExpenseCount = pageData.totalExpenseCount ?? pageData.expenses.length;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalExpenseCount / pageSize));
  }, [totalExpenseCount, pageSize]);

  // # Step 6: Clamp page when the filtered result set shrinks.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  // # Step 7: Reset back to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [searchInput, selectedCategoryId, selectedVendorId, showArchivedOnly, setPage]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return pageData.expenses.slice(startIndex, endIndex);
  }, [pageData.expenses, page, pageSize]);

  const handlePreviousPage = () => {
    // # Step 1: Move to the previous page without dropping below page 1.
    setPage((currentPage) => Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    // # Step 1: Move to the next page without exceeding the last page.
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  };

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <ExpensesHeader
        isEditing={Boolean(editingExpenseId)}
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={setActiveWorkspace}
        onCreateNew={() => {
          // # Step 8: Reset the form and return the user to Records.
          pageState.resetForm();
          setActiveWorkspace("records");
        }}
      />

      {activeWorkspace === "records" ? (
        <section
          className={WORKSPACE_SECTION_CLASS}
          aria-label="Expense records workspace"
        >
          <ExpensesFiltersBar
            searchInput={searchInput}
            selectedCategoryId={selectedCategoryId}
            selectedVendorId={selectedVendorId}
            showArchivedOnly={showArchivedOnly}
            totalExpenseCount={totalExpenseCount}
            categories={pageData.categories}
            vendors={pageData.vendors}
            onSearchChange={pageState.setSearchInput}
            onCategoryChange={pageState.setSelectedCategoryId}
            onVendorChange={pageState.setSelectedVendorId}
            onArchivedToggle={pageState.setShowArchivedOnly}
          />

          <ExpensesContent
            formSection={
              <ExpensesFormSection
                formKey={formInstanceKey}
                mode={pageData.formMode}
                initialValues={pageData.formInitialValues}
                categories={pageData.categories}
                vendors={pageData.vendors}
                isSubmitting={pageActions.isSubmitting}
                isLoadingDetail={pageData.isExpenseDetailLoading}
                submitError={pageActions.submitErrorMessage}
                onSubmit={pageActions.handleSubmit}
                onCancel={pageActions.handleCancelEdit}
              />
            }
            tableSection={
              <ExpensesTableSection
                expenses={paginatedExpenses}
                isLoading={pageData.isListLoading}
                listErrorMessage={pageData.listErrorMessage}
                showLookupWarning={pageData.hasLookupError}
                onEdit={pageActions.handleEdit}
                onArchive={pageActions.handleArchive}
                onUnarchive={pageActions.handleUnarchive}
                isArchiving={pageActions.isArchiving}
                isUnarchiving={pageActions.isUnarchiving}
                processingExpenseId={processingExpenseId}
                totalExpenseCount={totalExpenseCount}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
              />
            }
          />
        </section>
      ) : (
        <section
          className={WORKSPACE_SECTION_CLASS}
          aria-label="Expense reporting workspace"
        >
          <ExpenseReportingSection
            dashboard={pageData.dashboard}
            monthlyTrend={pageData.monthlyTrend}
            byCategory={pageData.byCategory}
            byBuilding={pageData.byBuilding}
            isLoading={pageData.isReportingLoading}
            errorMessage={pageData.reportingErrorMessage}
          />
        </section>
      )}
    </div>
  );
}