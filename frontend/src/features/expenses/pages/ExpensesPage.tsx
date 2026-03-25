// # Filename: src/features/expenses/pages/ExpensesPage.tsx

import { useEffect, useMemo, useState } from "react";

import ExpenseReportingSection from "../components/ExpenseReportingSection/ExpenseReportingSection";
import ExpensesContent from "./components/ ExpensesContent";
import ExpenseReportingFiltersBar from "../components/ExpenseReportingSection/ExpenseReportingFiltersBar";
import ExpensesFiltersBar from "./components/ExpensesFiltersBar";
import ExpensesFormSection from "./components/ExpenseFormSection";
import ExpensesHeader from "./components/ExpensesHeader";
import ExpensesTableSection from "./components/ExpensesTableSection";
import type { ExpensesWorkspaceTab } from "../components/ExpensesWorkspaceTabs";
import type { ExpenseScope } from "../api/expensesTypes";
import { useExpensesPageActions } from "./hooks/useExpensesPageActions";
import { useExpensesPageData } from "./hooks/useExpensesPageData";
import { useExpensesPageState } from "./hooks/useExpensesPageState";

const PAGE_CONTAINER_CLASS = "flex flex-col gap-6";
const WORKSPACE_SECTION_CLASS = "flex flex-col gap-6";

export default function ExpensesPage() {
  const pageState = useExpensesPageState();
  const pageData = useExpensesPageData(pageState);
  const pageActions = useExpensesPageActions({
    pageState,
  });

  const [activeWorkspace, setActiveWorkspace] =
    useState<ExpensesWorkspaceTab>("records");

  const {
    searchInput,
    selectedScope,
    selectedCategoryId,
    selectedVendorId,
    selectedBuildingId,
    selectedUnitId,
    showArchivedOnly,
    editingExpenseId,
    processingExpenseId,
    formInstanceKey,
    page,
    setPage,
    pageSize,
  } = pageState;

  const totalExpenseCount = pageData.totalExpenseCount ?? 0;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalExpenseCount / pageSize));
  }, [totalExpenseCount, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const handlePreviousPage = () => {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    pageState.setSearchInput(value);
  };

  const handleScopeChange = (value: ExpenseScope | null) => {
    setPage(1);
    pageState.setSelectedScope(value);

    if (value === "organization") {
      pageState.setSelectedBuildingId(null);
      pageState.setSelectedUnitId(null);
      return;
    }

    if (value === "building") {
      pageState.setSelectedUnitId(null);
    }
  };

  const handleCategoryChange = (value: number | null) => {
    setPage(1);
    pageState.setSelectedCategoryId(value);
  };

  const handleVendorChange = (value: number | null) => {
    setPage(1);
    pageState.setSelectedVendorId(value);
  };

  const handleBuildingChange = (value: number | null) => {
    setPage(1);
    pageState.setSelectedBuildingId(value);
    pageState.setSelectedUnitId(null);
  };

  const handleUnitChange = (value: number | null) => {
    setPage(1);
    pageState.setSelectedUnitId(value);
  };

  const handleArchivedToggle = (value: boolean) => {
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
            selectedScope={selectedScope}
            selectedCategoryId={selectedCategoryId}
            selectedVendorId={selectedVendorId}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            showArchivedOnly={showArchivedOnly}
            totalExpenseCount={totalExpenseCount}
            categories={pageData.categories}
            vendors={pageData.vendors}
            buildingOptions={pageData.buildingOptions}
            unitOptions={pageData.unitOptions}
            isPropertyLookupLoading={pageData.isPropertyLookupLoading}
            propertyLookupErrorMessage={pageData.propertyLookupErrorMessage}
            onSearchChange={handleSearchChange}
            onScopeChange={handleScopeChange}
            onCategoryChange={handleCategoryChange}
            onVendorChange={handleVendorChange}
            onBuildingChange={handleBuildingChange}
            onUnitChange={handleUnitChange}
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
          <ExpenseReportingFiltersBar
            selectedScope={selectedScope}
            selectedCategoryId={selectedCategoryId}
            selectedVendorId={selectedVendorId}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            categories={pageData.categories}
            vendors={pageData.vendors}
            buildingOptions={pageData.buildingOptions}
            unitOptions={pageData.unitOptions}
            isPropertyLookupLoading={pageData.isPropertyLookupLoading}
            propertyLookupErrorMessage={pageData.propertyLookupErrorMessage}
            onScopeChange={handleScopeChange}
            onCategoryChange={handleCategoryChange}
            onVendorChange={handleVendorChange}
            onBuildingChange={handleBuildingChange}
            onUnitChange={handleUnitChange}
          />

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