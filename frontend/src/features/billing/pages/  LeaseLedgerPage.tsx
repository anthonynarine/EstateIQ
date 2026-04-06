// # Filename: src/features/billing/pages/LeaseLedgerPage.tsx
// ✅ New Code

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { tokenStorage } from "../../../auth/tokenStorage";

import LeaseLedgerHeader from "../components/LeaseLedgerHeader";
import LeaseLedgerSummaryCards from "../components/LeaseLedgerSummaryCards";
import GenerateRentChargePanel from "../components/GenerateRentChargePanel";
import ChargesTable from "../components/ChargesTable";
import PaymentsTable from "../components/PaymentsTable";
import AllocationsTable from "../components/AllocationsTable";
import RecordPaymentModal from "../components/RecordPaymentModal";
import { useLeaseLedgerQuery } from "../hooks/useLeaseLedgerQuery";
import type {
  BillingApiErrorShape,
  BillingId,
  LeaseLedgerContext,
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

/**
 * normalizeLeaseId
 *
 * Converts the raw route lease id into a query-safe value.
 *
 * @param leaseId Raw lease identifier from route params.
 * @returns A normalized lease id or null when invalid.
 */
function normalizeLeaseId(leaseId?: string): BillingId | null {
  // Step 1: Normalize input
  const normalizedValue = leaseId?.trim();

  // Step 2: Guard empty route param
  if (!normalizedValue) {
    return null;
  }

  // Step 3: Return stable billing id
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
  // Step 1: Guard empty error
  if (!error) {
    return "Unable to load the lease ledger.";
  }

  // Step 2: Prefer standard Error messages
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  // Step 3: Try API error envelopes
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

  // Step 4: Final fallback
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
 * Why this helper exists:
 * The page should support Back to Unit immediately, but the exact backend
 * field path may evolve. This helper keeps navigation resilient while the
 * response shape stabilizes.
 *
 * @param lease Lease ledger context.
 * @returns Unit id as a string or null when unavailable.
 */
function getLeaseUnitId(lease?: LeaseLedgerContext): string | null {
  // Step 1: Guard missing context
  if (!lease || !isRecord(lease)) {
    return null;
  }

  // Step 2: Try the most likely unit id locations
  const directUnitId = lease.unit_id;
  if (
    typeof directUnitId === "string" ||
    typeof directUnitId === "number"
  ) {
    return String(directUnitId);
  }

  const unitValue = lease.unit;
  if (isRecord(unitValue)) {
    const nestedUnitId = unitValue.id;
    if (
      typeof nestedUnitId === "string" ||
      typeof nestedUnitId === "number"
    ) {
      return String(nestedUnitId);
    }
  }

  // Step 3: Fallback unavailable
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
  // Step 1: Resolve available labels
  const buildingLabel = getBuildingLabel(lease);
  const unitLabel = getUnitLabel(lease);

  // Step 2: Build ordered segments
  const segments = [
    buildingLabel,
    unitLabel ? `Unit ${unitLabel}` : null,
    "Lease Billing",
  ].filter(Boolean) as string[];

  // Step 3: Return null if nothing useful exists
  if (!segments.length) {
    return null;
  }

  // Step 4: Join for header display
  return segments.join(" / ");
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
 * - compose header, summary cards, write panels, tables, and modal state
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
  const ledgerCharges = leaseLedgerData?.charges ?? [];
  const ledgerPayments = leaseLedgerData?.payments ?? [];
  const ledgerAllocations = leaseLedgerData?.allocations ?? [];

  const breadcrumbText = useMemo(() => {
    return buildBreadcrumbText(leaseContext);
  }, [leaseContext]);

  const unitId = useMemo(() => {
    return getLeaseUnitId(leaseContext);
  }, [leaseContext]);

  const handleBackToUnit = () => {
    // Step 1: Prefer explicit unit navigation when available
    if (unitId) {
      navigate(`/dashboard/units/${unitId}${location.search || ""}`);
      return;
    }

    // Step 2: Graceful fallback for incomplete lease context
    navigate(-1);
  };

  if (!normalizedLeaseId) {
    return (
      <div className="p-4 sm:p-6">
        <main className="mx-auto w-full max-w-6xl space-y-6">
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
      <main className="mx-auto w-full max-w-7xl space-y-6">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="px-1">
                <h2 className="text-base font-semibold text-white">Charges</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Review posted obligations for this lease and track what
                  remains open.
                </p>
              </div>

              <ChargesTable
                charges={ledgerCharges}
                isLoading={isLedgerLoading}
              />
            </section>

            <section className="space-y-3">
              <div className="px-1">
                <h2 className="text-base font-semibold text-white">Payments</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Review recorded receipts for this lease, including any
                  unapplied remainder.
                </p>
              </div>

              <PaymentsTable
                isLoading={isLedgerLoading}
                payments={ledgerPayments}
              />
            </section>

            <section className="space-y-3">
              <div className="px-1">
                <h2 className="text-base font-semibold text-white">
                  Allocations
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Review how each payment was applied across posted lease
                  charges.
                </p>
              </div>

              <AllocationsTable
                allocations={ledgerAllocations}
                isLoading={isLedgerLoading}
              />
            </section>
          </div>

          <aside className="space-y-6">
            <GenerateRentChargePanel
              leaseId={normalizedLeaseId}
              onSuccess={() => {
                /**
                 * Query invalidation already happens inside the charge mutation
                 * hook. This callback stays available for future page-level
                 * side effects such as toasts or analytics events.
                 */
              }}
              orgSlug={orgSlug}
            />

            <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="space-y-5 p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Lease workspace
                  </p>

                  <p className="text-lg font-semibold text-white">
                    Billing guide
                  </p>

                  <p className="text-sm text-neutral-300">
                    This page is the lease-scoped billing source of truth.
                  </p>
                </div>

                <div className="space-y-3 text-sm leading-6 text-neutral-400">
                  <p>
                    Charges represent what is owed. Payments represent money
                    received. Allocations show how those payments were applied.
                  </p>

                  <p>
                    Balance visibility comes from the backend ledger read model,
                    not from recomputing billing truth in the browser.
                  </p>

                  <p>
                    Unit history can link to this ledger later, but it should
                    remain a historical index of lease ledgers rather than a
                    blended replacement for this workspace.
                  </p>
                </div>
              </div>
            </section>
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