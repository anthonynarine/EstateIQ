// # Filename: src/features/expenses/pages/ExpensesPage.tsx

import ExpenseReportingSection from "../components/ExpenseReportingSection";
import ExpensesContent from "../pages/components/ ExpensesContent"
import ExpensesFiltersBar from "./components/ExpensesFiltersBar";
import ExpensesFormSection from "./components/ExpensesFormSection";
import ExpensesHeader from "./components/ExpensesHeader";
import ExpensesTableSection from "./components/ExpensesTableSection";
import { useExpensesPageActions } from "./hooks/useExpensesPageActions";
import { useExpensesPageData } from "./hooks/useExpensesPageData";
import { useExpensesPageState } from "./hooks/useExpensesPageState";


export default function ExpensesPage() {
  const pageState = useExpensesPageState();
  const pageData = useExpensesPageData(pageState);
  const pageActions = useExpensesPageActions({
    pageState,
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <ExpensesHeader
        isEditing={Boolean(pageState.editingExpenseId)}
        onCreateNew={pageState.resetForm}
      />

      <ExpensesFiltersBar
        searchInput={pageState.searchInput}
        selectedCategoryId={pageState.selectedCategoryId}
        selectedVendorId={pageState.selectedVendorId}
        showArchivedOnly={pageState.showArchivedOnly}
        totalExpenseCount={pageData.totalExpenseCount}
        categories={pageData.categories}
        vendors={pageData.vendors}
        onSearchChange={pageState.setSearchInput}
        onCategoryChange={pageState.setSelectedCategoryId}
        onVendorChange={pageState.setSelectedVendorId}
        onArchivedToggle={pageState.setShowArchivedOnly}
      />

      <ExpenseReportingSection
        dashboard={pageData.dashboard}
        monthlyTrend={pageData.monthlyTrend}
        byCategory={pageData.byCategory}
        byBuilding={pageData.byBuilding}
        isLoading={pageData.isReportingLoading}
        errorMessage={pageData.reportingErrorMessage}
      />

      <ExpensesContent
        formSection={
          <ExpensesFormSection
            mode={pageData.formMode}
            initialValues={pageData.formInitialValues}
            categories={pageData.categories}
            vendors={pageData.vendors}
            isSubmitting={pageActions.isSubmitting}
            isLoadingDetail={pageData.expenseDetailQuery.isLoading}
            submitError={pageActions.submitErrorMessage}
            onSubmit={pageActions.handleSubmit}
            onCancel={pageState.resetForm}
          />
        }
        tableSection={
          <ExpensesTableSection
            expenses={pageData.expenses}
            isLoading={pageData.expenseListQuery.isLoading}
            listErrorMessage={pageData.listErrorMessage}
            showLookupWarning={pageData.hasLookupError}
            onEdit={pageActions.handleEdit}
            onArchive={pageActions.handleArchive}
            onUnarchive={pageActions.handleUnarchive}
            isArchiving={pageActions.isArchiving}
            isUnarchiving={pageActions.isUnarchiving}
          />
        }
      />
    </div>
  );
}