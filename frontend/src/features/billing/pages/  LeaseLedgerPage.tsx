// ✅ New Code
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import CollectionPaginationFooter from "../../../components/pagination/CollectionPaginationFooter";
import { tokenStorage } from "../../../auth/tokenStorage";

import LeaseLedgerHeader from "../components/LeaseLedgerHeader";
import LeaseLedgerSummaryCards from "../components/LeaseLedgerSummaryCards";
import GenerateRentChargePanel from "../components/GenerateRentChargePanel";
import ChargesTable from "../components/chargesTable/ChargesTable";
import PaymentsTable from "../components/PaymentsTable";
import AllocationsTable from "../components/AllocationsTable";
import RecordPaymentModal from "../components/RecordPaymentModal";
import { useLeaseLedgerQuery } from "../hooks/useLeaseLedgerQuery";
import type {
  BillingApiErrorShape,
  BillingId,
  LeaseLedgerAllocation,
  LeaseLedgerCharge,
  LeaseLedgerContext,
  LeaseLedgerPayment,
} from "../api/billingTypes";

/**
 * LeaseLedgerPageParams
 *
 * Route parameter contract for the lease ledger page.
 *
 * Mounted route:
 * `/dashboard/leases/:leaseId/ledger`
 */
type LeaseLedgerPageParams = {
  leaseId?: string;
};

type MaybeRecord = Record<string, unknown>;
type LedgerActivityTab = "charges" | "payments" | "allocations";

/**
 * LEDGER_ACTIVITY_PAGE_SIZE
 *
 * Shared page size for the unified ledger activity surface.
 */
const LEDGER_ACTIVITY_PAGE_SIZE = 4;

/**
 * normalizeLeaseId
 *
 * Converts the raw route lease id into a query-safe value.
 *
 * @param leaseId Raw lease identifier from route params.
 * @returns A normalized lease id or null when invalid.
 */
function normalizeLeaseId(leaseId?: string): BillingId | null {
  // Step 1: Normalize input.
  const normalizedValue = leaseId?.trim();

  // Step 2: Guard empty route param.
  if (!normalizedValue) {
    return null;
  }

  // Step 3: Return stable billing id.
  return normalizedValue;
}

/**
 * getQueryErrorMessage
 *
 * Extracts a display-safe message from the lease ledger query error.
 *
 * @param error Unknown query error.
 * @returns A user-facing error message.
 */
function getQueryErrorMessage(error: unknown): string {
  // Step 1: Guard empty error.
  if (!error) {
    return "Unable to load the lease ledger.";
  }

  // Step 2: Prefer standard Error messages.
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  // Step 3: Try API error envelopes.
  const apiError = error as BillingApiErrorShape;

  if (apiError.error?.message) {
    return apiError.error.message;
  }

  if (apiError.detail) {
    return apiError.detail;
  }

  if (apiError.message) {
    return apiError.message;
  }

  // Step 4: Final fallback.
  return "Unable to load the lease ledger.";
}

/**
 * isRecord
 *
 * Narrow unknown values into object-like records.
 *
 * @param value Unknown value.
 * @returns Whether the value is a plain object-like record.
 */
function isRecord(value: unknown): value is MaybeRecord {
  return typeof value === "object" && value !== null;
}

/**
 * getLeaseUnitId
 *
 * Best-effort extraction of the unit id from the lease ledger context.
 *
 * @param lease Lease ledger context.
 * @returns Unit id as a string or null when unavailable.
 */
function getLeaseUnitId(lease?: LeaseLedgerContext): string | null {
  // Step 1: Guard missing context.
  if (!lease || !isRecord(lease)) {
    return null;
  }

  // Step 2: Try direct unit id first.
  const directUnitId = lease.unit_id;
  if (typeof directUnitId === "string" || typeof directUnitId === "number") {
    return String(directUnitId);
  }

  // Step 3: Fallback to nested summary id.
  const unitValue = lease.unit;
  if (isRecord(unitValue)) {
    const nestedUnitId = unitValue.id;
    if (typeof nestedUnitId === "string" || typeof nestedUnitId === "number") {
      return String(nestedUnitId);
    }
  }

  // Step 4: No unit id available.
  return null;
}

/**
 * getBuildingLabel
 *
 * Resolves a display-safe building label from lease context.
 *
 * @param lease Lease ledger context.
 * @returns Building label or null.
 */
function getBuildingLabel(lease?: LeaseLedgerContext): string | null {
  if (!lease?.building?.label?.trim()) {
    return null;
  }

  return lease.building.label.trim();
}

/**
 * getUnitLabel
 *
 * Resolves a display-safe unit label from lease context.
 *
 * @param lease Lease ledger context.
 * @returns Unit label or null.
 */
function getUnitLabel(lease?: LeaseLedgerContext): string | null {
  if (!lease?.unit?.label?.trim()) {
    return null;
  }

  return lease.unit.label.trim();
}

/**
 * buildBreadcrumbText
 *
 * Builds subtle workspace context text for the header.
 *
 * @param lease Lease ledger context.
 * @returns Breadcrumb-style display text or null.
 */
function buildBreadcrumbText(lease?: LeaseLedgerContext): string | null {
  // Step 1: Resolve available labels.
  const buildingLabel = getBuildingLabel(lease);
  const unitLabel = getUnitLabel(lease);

  // Step 2: Build ordered segments.
  const segments = [
    buildingLabel,
    unitLabel ? `Unit ${unitLabel}` : null,
    "Lease Billing",
  ].filter(Boolean) as string[];

  // Step 3: Return null if nothing useful exists.
  if (!segments.length) {
    return null;
  }

  // Step 4: Join for header display.
  return segments.join(" / ");
}

/**
 * getLedgerActivityDescription
 *
 * Returns a compact description for the active activity tab.
 *
 * @param tab Active ledger tab.
 * @returns Tab-specific helper copy.
 */
function getLedgerActivityDescription(tab: LedgerActivityTab): string {
  if (tab === "charges") {
    return "Newest posted obligations first, including what remains open.";
  }

  if (tab === "payments") {
    return "Newest recorded receipts first, including any unapplied remainder.";
  }

  return "Newest payment-to-charge application activity first for audit and review.";
}

/**
 * getLedgerActivityItemLabel
 *
 * Returns the singular item label used by shared pagination.
 *
 * @param tab Active ledger tab.
 * @returns Singular pagination label.
 */
function getLedgerActivityItemLabel(tab: LedgerActivityTab): string {
  if (tab === "charges") {
    return "charge";
  }

  if (tab === "payments") {
    return "payment";
  }

  return "allocation";
}

/**
 * getTimestampOrMin
 *
 * Converts a date-like string into a numeric timestamp for sorting.
 * Invalid or missing values are pushed to the bottom.
 *
 * @param value Date-like string from the ledger payload.
 * @returns Numeric timestamp or Number.NEGATIVE_INFINITY.
 */
function getTimestampOrMin(value?: string | null): number {
  if (!value?.trim()) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedTimestamp = new Date(value).getTime();

  if (Number.isNaN(parsedTimestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsedTimestamp;
}

/**
 * getChargeSortTimestamp
 *
 * Resolves the best timestamp anchor for charge ordering.
 *
 * Sort priority:
 * 1. charge_month
 * 2. due_date
 *
 * @param charge Lease-ledger charge row.
 * @returns Timestamp used for newest-first sorting.
 */
function getChargeSortTimestamp(charge: LeaseLedgerCharge): number {
  const chargeMonthTimestamp = getTimestampOrMin(charge.charge_month);

  if (chargeMonthTimestamp !== Number.NEGATIVE_INFINITY) {
    return chargeMonthTimestamp;
  }

  return getTimestampOrMin(charge.due_date);
}

/**
 * sortChargesNewestFirst
 *
 * Returns a newest-first charge list for the lease ledger workspace.
 *
 * @param charges Raw ledger charges.
 * @returns New sorted charge array.
 */
function sortChargesNewestFirst(
  charges: LeaseLedgerCharge[],
): LeaseLedgerCharge[] {
  return [...charges].sort((leftCharge, rightCharge) => {
    // Step 1: Sort primarily by charge month, falling back to due date.
    const primaryDifference =
      getChargeSortTimestamp(rightCharge) - getChargeSortTimestamp(leftCharge);

    if (primaryDifference !== 0) {
      return primaryDifference;
    }

    // Step 2: Use due date as a secondary tie-breaker when both rows share
    // the same charge month or when both fell back to due date.
    const secondaryDifference =
      getTimestampOrMin(rightCharge.due_date) -
      getTimestampOrMin(leftCharge.due_date);

    if (secondaryDifference !== 0) {
      return secondaryDifference;
    }

    // Step 3: Use id as a stable final tie-breaker.
    return String(rightCharge.id).localeCompare(String(leftCharge.id));
  });
}

/**
 * sortPaymentsNewestFirst
 *
 * Returns a newest-first payment list for the lease ledger workspace.
 *
 * @param payments Raw ledger payments.
 * @returns New sorted payment array.
 */
function sortPaymentsNewestFirst(
  payments: LeaseLedgerPayment[],
): LeaseLedgerPayment[] {
  return [...payments].sort((leftPayment, rightPayment) => {
    // Step 1: Sort by newest paid_at first.
    const timestampDifference =
      getTimestampOrMin(rightPayment.paid_at) -
      getTimestampOrMin(leftPayment.paid_at);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    // Step 2: Use id as a stable final tie-breaker.
    return String(rightPayment.id).localeCompare(String(leftPayment.id));
  });
}

/**
 * sortAllocationsNewestFirst
 *
 * Returns a newest-first allocation list for the lease ledger workspace.
 *
 * @param allocations Raw ledger allocations.
 * @returns New sorted allocation array.
 */
function sortAllocationsNewestFirst(
  allocations: LeaseLedgerAllocation[],
): LeaseLedgerAllocation[] {
  return [...allocations].sort((leftAllocation, rightAllocation) => {
    // Step 1: Sort by newest created_at first.
    const timestampDifference =
      getTimestampOrMin(rightAllocation.created_at) -
      getTimestampOrMin(leftAllocation.created_at);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    // Step 2: Use id as a stable final tie-breaker.
    return String(rightAllocation.id).localeCompare(String(leftAllocation.id));
  });
}

/**
 * sliceLedgerRows
 *
 * Slices a ledger collection for shared section-level pagination.
 *
 * @param rows Full collection.
 * @param page Current page number.
 * @returns Visible row subset.
 */
function sliceLedgerRows<T>(rows: T[], page: number): T[] {
  const startIndex = (page - 1) * LEDGER_ACTIVITY_PAGE_SIZE;
  const endIndex = startIndex + LEDGER_ACTIVITY_PAGE_SIZE;

  return rows.slice(startIndex, endIndex);
}

/**
 * LeaseLedgerPage
 *
 * Primary billing page for a single lease ledger.
 *
 * Responsibilities:
 * - read `leaseId` from the route
 * - resolve the active organization slug for org-scoped billing queries
 * - load the lease ledger read model
 * - compose header, summary cards, write panels, unified ledger activity, and modal state
 *
 * Important architectural boundary:
 * This page is orchestration-only. Heavy logic belongs in:
 * - query hooks
 * - mutation hooks
 * - API modules
 * - focused presentational components
 *
 * @returns The lease ledger workspace page.
 */
export default function LeaseLedgerPage() {
  const { leaseId } = useParams<LeaseLedgerPageParams>();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] =
    useState<boolean>(false);
  const [activeLedgerTab, setActiveLedgerTab] =
    useState<LedgerActivityTab>("charges");
  const [ledgerPages, setLedgerPages] = useState<Record<LedgerActivityTab, number>>({
    charges: 1,
    payments: 1,
    allocations: 1,
  });

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

  const existingChargeMonths = useMemo<string[]>(() => {
    // Step 1: Extract known charge month anchors from ledger charges.
    return ledgerCharges
      .map((charge) => charge.charge_month)
      .filter((chargeMonth): chargeMonth is string => Boolean(chargeMonth?.trim()));
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

  useEffect(() => {
    if (activePage > totalPages) {
      setLedgerPages((previousPages) => ({
        ...previousPages,
        [activeLedgerTab]: 1,
      }));
    }
  }, [activeLedgerTab, activePage, totalPages]);

  const handleBackToUnit = () => {
    // Step 1: Prefer explicit unit navigation when available.
    if (unitId) {
      navigate(`/dashboard/units/${unitId}${location.search || ""}`);
      return;
    }

    // Step 2: Graceful fallback for incomplete lease context.
    navigate(-1);
  };

  const handleLedgerTabChange = (tab: LedgerActivityTab) => {
    setActiveLedgerTab(tab);
  };

  const handleLedgerPreviousPage = () => {
    setLedgerPages((previousPages) => ({
      ...previousPages,
      [activeLedgerTab]: Math.max(1, previousPages[activeLedgerTab] - 1),
    }));
  };

  const handleLedgerNextPage = () => {
    setLedgerPages((previousPages) => ({
      ...previousPages,
      [activeLedgerTab]: Math.min(totalPages, previousPages[activeLedgerTab] + 1),
    }));
  };

  if (!normalizedLeaseId) {
    return (
      <div className="p-4 sm:p-6">
        <main className="mx-auto w-full max-w-6xl space-y-5">
          <section className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
              Billing
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-white">
              Lease ledger unavailable
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              The current route is missing a valid lease id. Open this page from
              a lease-specific route such as
              <code className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-slate-100">
                /dashboard/leases/&lt;leaseId&gt;/ledger
              </code>
              .
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <LeaseLedgerHeader
          isLoading={isLedgerLoading}
          isRefreshing={leaseLedgerQuery.isFetching}
          lease={leaseContext}
          leaseId={normalizedLeaseId}
          breadcrumbText={breadcrumbText}
          backToUnitDisabled={!unitId}
          onBackToUnit={handleBackToUnit}
          onRecordPayment={() => {
            setIsRecordPaymentModalOpen(true);
          }}
        />

        {!orgSlug ? (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
            <p className="text-sm leading-6 text-amber-100">
              No active organization slug was found in client storage. The
              shared axios layer may still provide org scoping, but this should
              be wired to the real Org context next so billing queries stay
              explicit.
            </p>
          </section>
        ) : null}

        {leaseLedgerQuery.isError ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-rose-100">
                  {getQueryErrorMessage(leaseLedgerQuery.error)}
                </p>

                <p className="mt-1 text-xs leading-5 text-rose-200/90">
                  The ledger response should provide lease context, totals,
                  charges, payments, and allocations so this workspace can stay
                  backend-driven and deterministic.
                </p>
              </div>

              <button
                className="inline-flex items-center justify-center rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-50 transition hover:bg-rose-300/15"
                onClick={() => {
                  void leaseLedgerQuery.refetch();
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          </section>
        ) : null}

        <LeaseLedgerSummaryCards
          isLoading={isLedgerLoading}
          totals={ledgerTotals}
        />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="border-b border-neutral-800/80 px-5 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start xl:gap-5">
                <div className="min-w-0 max-w-[34rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Ledger activity
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Charges, payments, and allocation trail
                  </h2>

                  <p className="mt-1 text-sm text-neutral-400">
                    {getLedgerActivityDescription(activeLedgerTab)}
                  </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:flex-nowrap xl:justify-end xl:overflow-visible xl:pb-0">
                  {ledgerTabMeta.map((tab) => {
                    const isActive = activeLedgerTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[15px] font-medium transition ${
                          isActive
                            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                            : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.06]"
                        }`}
                        onClick={() => {
                          handleLedgerTabChange(tab.key);
                        }}
                        type="button"
                      >
                        <span>{tab.label}</span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            isActive
                              ? "bg-cyan-400/15 text-cyan-100"
                              : "bg-white/[0.05] text-neutral-400"
                          }`}
                        >
                          {isLedgerLoading ? "—" : tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeLedgerTab === "charges" ? (
              <ChargesTable
                charges={visibleCharges}
                isLoading={isLedgerLoading}
                variant="embedded"
              />
            ) : null}

            {activeLedgerTab === "payments" ? (
              <PaymentsTable
                isLoading={isLedgerLoading}
                payments={visiblePayments}
                variant="embedded"
              />
            ) : null}

            {activeLedgerTab === "allocations" ? (
              <AllocationsTable
                allocations={visibleAllocations}
                isLoading={isLedgerLoading}
                variant="embedded"
              />
            ) : null}

            {!isLedgerLoading &&
            activeCollectionCount > LEDGER_ACTIVITY_PAGE_SIZE ? (
              <CollectionPaginationFooter
                page={activePage}
                pageSize={LEDGER_ACTIVITY_PAGE_SIZE}
                totalCount={activeCollectionCount}
                itemLabel={getLedgerActivityItemLabel(activeLedgerTab)}
                onPrevious={handleLedgerPreviousPage}
                onNext={handleLedgerNextPage}
              />
            ) : null}
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <GenerateRentChargePanel
              leaseId={normalizedLeaseId}
              orgSlug={orgSlug}
              existingChargeMonths={existingChargeMonths}
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
          isOpen={isRecordPaymentModalOpen}
          leaseId={normalizedLeaseId}
          onClose={() => {
            setIsRecordPaymentModalOpen(false);
          }}
          orgSlug={orgSlug}
        />
      </main>
    </div>
  );
}