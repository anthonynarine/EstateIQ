// # Filename: src/features/billing/pages/LeaseLedgerPage.tsx



import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { tokenStorage } from "../../../auth/tokenStorage";

import LeaseLedgerHeader from "../components/LeaseLedgerHeader";
import LeaseLedgerSummaryCards from "../components/LeaseLedgerSummaryCards";
import GenerateRentChargePanel from "../components/GenerateRentChargePanel";
import ChargesTable from "../components/ChargesTable";
import PaymentsTable from "../components/PaymentsTable";
import AllocationsTable from "../components/AllocationsTable";
import RecordPaymentModal from "../components/RecordPaymentModal";
import { useLeaseLedgerQuery } from "../hooks/useLeaseLedgerQuery";
import type { BillingApiErrorShape, BillingId } from "../api/billingTypes";

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

/**
 * normalizeLeaseId
 *
 * Converts the raw route lease id into a query-safe value.
 *
 * @param leaseId - Raw lease identifier from route params.
 * @returns A normalized lease id or null when invalid.
 */
function normalizeLeaseId(leaseId?: string): BillingId | null {
  const normalizedValue = leaseId?.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

/**
 * getQueryErrorMessage
 *
 * Extracts a display-safe message from the lease ledger query error.
 *
 * @param error - Unknown query error.
 * @returns A user-facing error message.
 */
function getQueryErrorMessage(error: unknown): string {
  if (!error) {
    return "Unable to load the lease ledger.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

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

  return "Unable to load the lease ledger.";
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

  if (!normalizedLeaseId) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
            Billing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Lease ledger unavailable
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            The current route is missing a valid lease id. Open this page from a
            lease-specific route such as
            <code className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-slate-100">
              /dashboard/leases/&lt;leaseId&gt;/ledger
            </code>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <LeaseLedgerHeader
        isLoading={isLedgerLoading}
        lease={leaseContext}
        leaseId={normalizedLeaseId}
      />

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          onClick={() => {
            setIsRecordPaymentModalOpen(true);
          }}
          type="button"
        >
          Record payment
        </button>
      </section>

      {!orgSlug ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-sm leading-6 text-amber-100">
            No active organization slug was found in client storage. The shared
            axios layer may still provide org scoping, but this should be wired
            to the real Org context next so billing queries stay explicit.
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
                The lease ledger endpoint should return charges, payments,
                allocations, totals, and lease context for this page. :contentReference[oaicite:0]{index=0}
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
          <ChargesTable
            charges={ledgerCharges}
            isLoading={isLedgerLoading}
          />

          <PaymentsTable
            isLoading={isLedgerLoading}
            payments={ledgerPayments}
          />

          <AllocationsTable
            allocations={ledgerAllocations}
            isLoading={isLedgerLoading}
          />
        </div>

        <div className="space-y-6">
          <GenerateRentChargePanel
            leaseId={normalizedLeaseId}
            onSuccess={() => {
              /**
               * Query invalidation already happens inside the charge mutation hook.
               * This callback is intentionally available for future page-level
               * side effects such as toasts or analytics events.
               */
            }}
            orgSlug={orgSlug}
          />

          <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-sm backdrop-blur-sm">
            <h2 className="text-base font-semibold text-white">
              Lease ledger notes
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <p>
                This page is driven by the lease ledger read model, not by
                recomputing balances in the browser. The backend remains the
                financial source of truth. 
              </p>

              <p>
                Recording a payment and generating a rent charge should refresh
                the lease ledger view automatically through billing query
                invalidation.
              </p>

              <p>
                The billing slice is intentionally lease-scoped so charges,
                payments, and allocations remain attached to the underlying
                obligation context. 
              </p>
            </div>
          </section>
        </div>
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
  );
}