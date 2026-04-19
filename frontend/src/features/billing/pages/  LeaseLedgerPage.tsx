// # Filename: src/features/billing/pages/LeaseLedgerPage.tsx

import GenerateRentChargePanel from "../components/GenerateRentChargePanel";
import LeaseLedgerHeader from "../components/LeaseLedgerHeader";
import LeaseLedgerSummaryCards from "../components/LeaseLedgerSummaryCards";
import RecordPaymentModal from "../components/recordPaymentModal/RecordPaymentModal";
import LeaseLedgerActivityPanel from "./leaseLedgerPage/LeaseLedgerActivityPanel";
import LeaseLedgerQueryState from "./leaseLedgerPage/LeaseLedgerQueryState";
import { useLeaseLedgerWorkspace } from "./leaseLedgerPage/useLeaseLedgerWorkspace";

/**
 * LeaseLedgerPage
 *
 * Primary billing workspace page for a single lease ledger.
 *
 * Responsibilities:
 * - compose the lease header and summary cards
 * - render route/query state UI
 * - render the unified ledger activity panel
 * - render the rent-charge side panel
 * - own the shared payment modal lifecycle through workspace state
 *
 * Important architectural boundary:
 * This page is orchestration-focused.
 * Heavy data shaping and UI state preparation live in
 * `useLeaseLedgerWorkspace`, while visual state rendering lives in
 * focused child components.
 *
 * @returns The lease-ledger billing workspace page.
 */
export default function LeaseLedgerPage() {
  const workspace = useLeaseLedgerWorkspace();

  if (!workspace.normalizedLeaseId) {
    return <LeaseLedgerQueryState kind="missing_lease_id" />;
  }

  return (
    <div className="p-4 sm:p-6">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <LeaseLedgerHeader
          backToUnitDisabled={!workspace.unitId}
          breadcrumbText={workspace.breadcrumbText}
          isLoading={workspace.isLedgerLoading}
          isRefreshing={workspace.leaseLedgerQuery.isFetching}
          lease={workspace.leaseContext}
          leaseId={workspace.normalizedLeaseId}
          onBackToUnit={workspace.handleBackToUnit}
          onRecordPayment={workspace.handleOpenRecordPayment}
        />

        {!workspace.orgSlug ? (
          <LeaseLedgerQueryState kind="org_warning" />
        ) : null}

        {workspace.leaseLedgerQuery.isError && workspace.queryErrorMessage ? (
          <LeaseLedgerQueryState
            kind="query_error"
            message={workspace.queryErrorMessage}
            onRetry={workspace.handleRetryLedgerQuery}
          />
        ) : null}

        <LeaseLedgerSummaryCards
          isLoading={workspace.isLedgerLoading}
          totals={workspace.ledgerTotals}
        />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <LeaseLedgerActivityPanel
            activeCollectionCount={workspace.activeCollectionCount}
            activeLedgerTab={workspace.activeLedgerTab}
            activePage={workspace.activePage}
            activityDescription={workspace.activityDescription}
            isLoading={workspace.isLedgerLoading}
            itemLabel={workspace.paginationItemLabel}
            ledgerTabMeta={workspace.ledgerTabMeta}
            onLedgerTabChange={workspace.handleLedgerTabChange}
            onNextPage={workspace.handleLedgerNextPage}
            onPreviousPage={workspace.handleLedgerPreviousPage}
            onPayCharge={workspace.handleOpenChargePayment}
            pageSize={workspace.pageSize}
            visibleAllocations={workspace.visibleAllocations}
            visibleCharges={workspace.visibleCharges}
            visiblePayments={workspace.visiblePayments}
          />

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <GenerateRentChargePanel
              existingChargeMonths={workspace.existingChargeMonths}
              leaseId={workspace.normalizedLeaseId}
              orgSlug={workspace.orgSlug}
              onSuccess={() => {
                /**
                 * Query invalidation already happens inside the charge mutation
                 * hook. This callback stays available for future page-level
                 * side effects such as toasts or analytics events.
                 */
              }}
            />
          </aside>
        </div>

        <RecordPaymentModal
          isOpen={workspace.isRecordPaymentModalOpen}
          leaseId={workspace.normalizedLeaseId}
          onClose={workspace.handleCloseRecordPaymentModal}
          onSuccess={(response) => {
            void response;
          }}
          openCharges={workspace.openCharges}
          orgSlug={workspace.orgSlug}
          selectedCharge={workspace.selectedChargeForPayment}
        />
      </main>
    </div>
  );
}