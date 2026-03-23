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
const LOOKUP_ALERT_CLASS =
  "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200";
const DEV_DEBUG_CLASS =
  "rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100";

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

  // # Step 6: Use backend count as the source of truth for pagination.
  const totalExpenseCount = pageData.totalExpenseCount ?? 0;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalExpenseCount / pageSize));
  }, [totalExpenseCount, pageSize]);

  // # Step 7: Clamp page when the filtered result set shrinks.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const handlePreviousPage = () => {
    // # Step 1: Move to the previous page without dropping below page 1.
    setPage((currentPage) => Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    // # Step 1: Move to the next page without exceeding the last page.
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  };

  const handleSearchChange = (value: string) => {
    // # Step 1: Reset pagination when the search filter changes.
    setPage(1);
    pageState.setSearchInput(value);
  };

  const handleCategoryChange = (value: number | null) => {
    // # Step 1: Reset pagination when the category filter changes.
    setPage(1);
    pageState.setSelectedCategoryId(value);
  };

  const handleVendorChange = (value: number | null) => {
    // # Step 1: Reset pagination when the vendor filter changes.
    setPage(1);
    pageState.setSelectedVendorId(value);
  };

  const handleArchivedToggle = (value: boolean) => {
    // # Step 1: Reset pagination when the archived filter changes.
    setPage(1);
    pageState.setShowArchivedOnly(value);
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
          {/* {pageData.lookupErrorMessage ? (
            <div className={LOOKUP_ALERT_CLASS}>
              Failed to load expense lookup options: {pageData.lookupErrorMessage}
            </div>
          ) : null}

          <div className={DEV_DEBUG_CLASS}>
            <div>categories count: {pageData.categories.length}</div>
            <div>vendors count: {pageData.vendors.length}</div>
            <div>categories query status: {pageData.categoriesQuery.status}</div>
            <div>vendors query status: {pageData.vendorsQuery.status}</div>
            <div>
              categories fetch status: {pageData.categoriesQuery.fetchStatus}
            </div>
            <div>vendors fetch status: {pageData.vendorsQuery.fetchStatus}</div>
          </div> */}

          <ExpensesFiltersBar
            searchInput={searchInput}
            selectedCategoryId={selectedCategoryId}
            selectedVendorId={selectedVendorId}
            showArchivedOnly={showArchivedOnly}
            totalExpenseCount={totalExpenseCount}
            categories={pageData.categories}
            vendors={pageData.vendors}
            onSearchChange={handleSearchChange}
            onCategoryChange={handleCategoryChange}
            onVendorChange={handleVendorChange}
            onArchivedToggle={handleArchivedToggle}
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
                expenses={pageData.expenses}
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
                isListFetching={pageData.expenseListQuery.isFetching}
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