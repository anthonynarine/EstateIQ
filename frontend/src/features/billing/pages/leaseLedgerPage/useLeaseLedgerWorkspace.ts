// # Filename: src/features/billing/pages/leaseLedgerPage/useLeaseLedgerWorkspace.ts



import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { tokenStorage } from "../../../../auth/tokenStorage";
import type {
  BillingId,
  LeaseLedgerAllocation,
  LeaseLedgerCharge,
  LeaseLedgerPayment,
} from "../../api/types";
import { useLeaseLedgerQuery } from "../../hooks/useLeaseLedgerQuery";
import {
  LEDGER_ACTIVITY_PAGE_SIZE,
  getLedgerActivityDescription,
  getLedgerActivityItemLabel,
  sliceLedgerRows,
  sortAllocationsNewestFirst,
  sortChargesNewestFirst,
  sortPaymentsNewestFirst,
} from "./leaseLedgerActivityUtils";
import {
  buildBreadcrumbText,
  getLeaseUnitId,
  getQueryErrorMessage,
  normalizeLeaseId,
} from "./leaseLedgerPageUtils";

/**
 * LeaseLedgerPageParams
 *
 * Route params contract for the lease-ledger page.
 */
type LeaseLedgerPageParams = {
  leaseId?: string;
};

/**
 * LedgerActivityTab
 *
 * Supported tabs for the unified lease-ledger activity surface.
 */
type LedgerActivityTab = "charges" | "payments" | "allocations";

/**
 * useLeaseLedgerWorkspace
 *
 * Orchestration hook for the lease-ledger page.
 *
 * Responsibilities:
 * - normalize route and org context
 * - execute the lease-ledger query
 * - prepare sorted ledger collections
 * - manage activity-tab and pagination state
 * - manage modal open/close state
 * - prepare future-safe payment-modal context such as open charges and
 *   selected charge state
 *
 * Important:
 * This hook owns page-level orchestration only.
 * It does not replace API modules, query hooks, or billing business logic.
 *
 * @returns Prepared state and handlers for LeaseLedgerPage.
 */
export function useLeaseLedgerWorkspace() {
  const { leaseId } = useParams<LeaseLedgerPageParams>();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] =
    useState<boolean>(false);
  const [activeLedgerTab, setActiveLedgerTab] =
    useState<LedgerActivityTab>("charges");
  const [ledgerPages, setLedgerPages] = useState<
    Record<LedgerActivityTab, number>
  >({
    charges: 1,
    payments: 1,
    allocations: 1,
  });
  const [selectedChargeForPayment, setSelectedChargeForPayment] =
    useState<LeaseLedgerCharge | null>(null);

  const normalizedLeaseId = useMemo(() => {
    return normalizeLeaseId(leaseId);
  }, [leaseId]);

  const orgSlug = useMemo(() => {
    return tokenStorage.getOrgSlug();
  }, []);

  const leaseLedgerQuery = useLeaseLedgerQuery({
    leaseId: normalizedLeaseId,
    orgSlug,
    enabled: Boolean(normalizedLeaseId),
  });

  const isLedgerLoading = leaseLedgerQuery.isPending;
  const leaseLedgerData = leaseLedgerQuery.data;
  const leaseContext = leaseLedgerData?.lease;
  const ledgerTotals = leaseLedgerData?.totals;

  const ledgerCharges = useMemo<LeaseLedgerCharge[]>(() => {
    return sortChargesNewestFirst(leaseLedgerData?.charges ?? []);
  }, [leaseLedgerData?.charges]);

  const ledgerPayments = useMemo<LeaseLedgerPayment[]>(() => {
    return sortPaymentsNewestFirst(leaseLedgerData?.payments ?? []);
  }, [leaseLedgerData?.payments]);

  const ledgerAllocations = useMemo<LeaseLedgerAllocation[]>(() => {
    return sortAllocationsNewestFirst(leaseLedgerData?.allocations ?? []);
  }, [leaseLedgerData?.allocations]);

  const openCharges = useMemo<LeaseLedgerCharge[]>(() => {
    return ledgerCharges.filter((charge) => {
      return Number(charge.remaining_balance ?? 0) > 0;
    });
  }, [ledgerCharges]);

  const existingChargeMonths = useMemo<string[]>(() => {
    return ledgerCharges
      .map((charge) => charge.charge_month)
      .filter((chargeMonth): chargeMonth is string =>
        Boolean(chargeMonth?.trim()),
      );
  }, [ledgerCharges]);

  const breadcrumbText = useMemo(() => {
    return buildBreadcrumbText(leaseContext);
  }, [leaseContext]);

  const unitId = useMemo(() => {
    return getLeaseUnitId(leaseContext);
  }, [leaseContext]);

  const ledgerTabMeta = useMemo(() => {
    return [
      {
        key: "charges" as const,
        label: "Charges",
        count: ledgerCharges.length,
      },
      {
        key: "payments" as const,
        label: "Payments",
        count: ledgerPayments.length,
      },
      {
        key: "allocations" as const,
        label: "Allocations",
        count: ledgerAllocations.length,
      },
    ];
  }, [ledgerAllocations.length, ledgerCharges.length, ledgerPayments.length]);

  const activePage = ledgerPages[activeLedgerTab];

  const activeCollectionCount = useMemo(() => {
    if (activeLedgerTab === "charges") {
      return ledgerCharges.length;
    }

    if (activeLedgerTab === "payments") {
      return ledgerPayments.length;
    }

    return ledgerAllocations.length;
  }, [
    activeLedgerTab,
    ledgerAllocations.length,
    ledgerCharges.length,
    ledgerPayments.length,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(activeCollectionCount / LEDGER_ACTIVITY_PAGE_SIZE),
  );

  const visibleCharges = useMemo<LeaseLedgerCharge[]>(() => {
    return sliceLedgerRows(ledgerCharges, ledgerPages.charges);
  }, [ledgerCharges, ledgerPages.charges]);

  const visiblePayments = useMemo<LeaseLedgerPayment[]>(() => {
    return sliceLedgerRows(ledgerPayments, ledgerPages.payments);
  }, [ledgerPages.payments, ledgerPayments]);

  const visibleAllocations = useMemo<LeaseLedgerAllocation[]>(() => {
    return sliceLedgerRows(ledgerAllocations, ledgerPages.allocations);
  }, [ledgerAllocations, ledgerPages.allocations]);

  const activityDescription = useMemo(() => {
    return getLedgerActivityDescription(activeLedgerTab);
  }, [activeLedgerTab]);

  const paginationItemLabel = useMemo(() => {
    return getLedgerActivityItemLabel(activeLedgerTab);
  }, [activeLedgerTab]);

  const queryErrorMessage = useMemo(() => {
    return leaseLedgerQuery.isError
      ? getQueryErrorMessage(leaseLedgerQuery.error)
      : null;
  }, [leaseLedgerQuery.error, leaseLedgerQuery.isError]);

  useEffect(() => {
    if (activePage > totalPages) {
      setLedgerPages((previousPages) => ({
        ...previousPages,
        [activeLedgerTab]: 1,
      }));
    }
  }, [activeLedgerTab, activePage, totalPages]);

  /**
   * handleBackToUnit
   *
   * Navigates back to the related unit page when the unit id exists.
   * Falls back to browser history when lease context is incomplete.
   */
  function handleBackToUnit() {
    // Step 1: Prefer explicit unit navigation when available.
    if (unitId) {
      navigate(`/dashboard/units/${unitId}${location.search || ""}`);
      return;
    }

    // Step 2: Gracefully fall back when unit context is missing.
    navigate(-1);
  }

  /**
   * handleLedgerTabChange
   *
   * Switches the active ledger activity tab.
   *
   * @param tab Next active tab.
   */
  function handleLedgerTabChange(tab: LedgerActivityTab) {
    setActiveLedgerTab(tab);
  }

  /**
   * handleLedgerPreviousPage
   *
   * Moves the active tab collection one page backward.
   */
  function handleLedgerPreviousPage() {
    setLedgerPages((previousPages) => ({
      ...previousPages,
      [activeLedgerTab]: Math.max(1, previousPages[activeLedgerTab] - 1),
    }));
  }

  /**
   * handleLedgerNextPage
   *
   * Moves the active tab collection one page forward.
   */
  function handleLedgerNextPage() {
    setLedgerPages((previousPages) => ({
      ...previousPages,
      [activeLedgerTab]: Math.min(
        totalPages,
        previousPages[activeLedgerTab] + 1,
      ),
    }));
  }

  /**
   * handleOpenRecordPayment
   *
   * Opens the payment modal in general lease-level mode.
   *
   * Responsibilities:
   * - clear any previously selected charge context
   * - preserve the page as the owner of modal orchestration
   */
  function handleOpenRecordPayment() {
    setSelectedChargeForPayment(null);
    setIsRecordPaymentModalOpen(true);
  }

  /**
   * handleOpenChargePayment
   *
   * Opens the payment modal using a specific charge as prefill context.
   *
   * Responsibilities:
   * - store the selected charge at the page/workspace layer
   * - preserve the original modal plan where the page, not the table,
   *   owns orchestration
   *
   * Note:
   * The current RecordPaymentModal does not consume this yet.
   * We are preparing the correct page boundary now so the next modal pass
   * stays clean.
   *
   * @param charge Charge row selected from the ledger table.
   */
  function handleOpenChargePayment(charge: LeaseLedgerCharge) {
    setSelectedChargeForPayment(charge);
    setIsRecordPaymentModalOpen(true);
  }

  /**
   * handleCloseRecordPaymentModal
   *
   * Closes the payment modal and clears any charge-prefill context.
   */
  function handleCloseRecordPaymentModal() {
    setIsRecordPaymentModalOpen(false);
    setSelectedChargeForPayment(null);
  }

  /**
   * handleRetryLedgerQuery
   *
   * Retries the lease-ledger query after an error state.
   */
  function handleRetryLedgerQuery() {
    void leaseLedgerQuery.refetch();
  }

  return {
    normalizedLeaseId,
    orgSlug,
    leaseLedgerQuery,
    isLedgerLoading,
    leaseLedgerData,
    leaseContext,
    ledgerTotals,
    ledgerCharges,
    ledgerPayments,
    ledgerAllocations,
    openCharges,
    selectedChargeForPayment,
    existingChargeMonths,
    breadcrumbText,
    unitId,
    ledgerTabMeta,
    activeLedgerTab,
    activePage,
    activeCollectionCount,
    visibleCharges,
    visiblePayments,
    visibleAllocations,
    activityDescription,
    paginationItemLabel,
    isRecordPaymentModalOpen,
    queryErrorMessage,
    pageSize: LEDGER_ACTIVITY_PAGE_SIZE,
    handleBackToUnit,
    handleLedgerTabChange,
    handleLedgerPreviousPage,
    handleLedgerNextPage,
    handleOpenRecordPayment,
    handleOpenChargePayment,
    handleCloseRecordPaymentModal,
    handleRetryLedgerQuery,
  };
}