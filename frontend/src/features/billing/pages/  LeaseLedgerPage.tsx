// # Filename: src/features/billing/pages/LeaseLedgerPage.tsx

import { useMemo } from "react";
import { useParams } from "react-router-dom";

/**
 * LeaseLedgerPageParams
 *
 * Route parameter contract for the lease ledger page.
 * This page is mounted at:
 * `/dashboard/leases/:leaseId/ledger`
 */
type LeaseLedgerPageParams = {
  leaseId?: string;
};

/**
 * PlaceholderCardProps
 *
 * Lightweight props for scaffold cards used while the billing feature
 * is being wired one file at a time.
 */
type PlaceholderCardProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/**
 * formatLeaseDisplayLabel
 *
 * Converts a raw route lease id into a user-facing label suitable for
 * headers and breadcrumbs.
 *
 * @param leaseId - The raw lease identifier from the route params.
 * @returns A formatted display string for the page header.
 */
function formatLeaseDisplayLabel(leaseId?: string): string {
  if (!leaseId) {
    return "Lease ledger";
  }

  return `Lease ${leaseId}`;
}

/**
 * PlaceholderCard
 *
 * Small presentation helper used to keep the first page scaffold visually
 * organized without prematurely coupling the page to future billing
 * components that do not exist yet.
 *
 * @param props - Card display content.
 * @returns A styled placeholder panel.
 */
function PlaceholderCard({
  title,
  description,
  children,
}: PlaceholderCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      {children}
    </section>
  );
}

/**
 * LeaseLedgerPage
 *
 * Billing feature entry page for a single lease ledger.
 *
 * Current responsibilities in this first scaffold:
 * - read and validate the `leaseId` route parameter
 * - render a production-safe page shell that matches the dashboard theme
 * - provide clear composition zones for:
 *   - lease header
 *   - summary cards
 *   - charge generation
 *   - charges table
 *   - payments table
 *   - allocations table
 *
 * Future responsibilities after related billing files are created:
 * - call the lease ledger query hook
 * - open the RecordPaymentModal
 * - submit GenerateRentChargePanel actions
 * - render selector-backed ledger data from the backend
 *
 * Important:
 * This page intentionally avoids importing future billing hooks/components
 * that do not exist yet. That keeps the app compiling while we build the
 * billing feature one file at a time.
 *
 * @returns The lease ledger page scaffold for the billing workspace.
 */
export default function LeaseLedgerPage() {
  const { leaseId } = useParams<LeaseLedgerPageParams>();

  const leaseLabel = useMemo(() => {
    return formatLeaseDisplayLabel(leaseId);
  }, [leaseId]);

  const hasLeaseId = Boolean(leaseId?.trim());

  if (!hasLeaseId) {
    return (
      <main className="space-y-6">
        <header className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-rose-300">
            Billing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Lease ledger unavailable
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            The ledger route is missing a valid <code>leaseId</code> parameter.
            This page must be opened from a lease-specific route such as
            <code className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-slate-200">
              /dashboard/leases/&lt;leaseId&gt;/ledger
            </code>
            .
          </p>
        </header>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* // ✅ New Code */}
      <header className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
              Billing
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {leaseLabel}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              This page will become the operational source of truth for lease
              charges, payments, allocations, and delinquency context. The
              ledger math will remain backend-derived so the frontend only
              renders trusted billing state.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 opacity-70"
            >
              Record payment
            </button>

            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-200 opacity-70"
            >
              Generate rent charge
            </button>
          </div>
        </div>
      </header>

      {/* // ✅ New Code */}
      <section
        aria-label="Ledger status"
        className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"
      >
        <p className="text-sm leading-6 text-amber-100">
          The billing UI shell is in place. Next we will wire real contracts,
          queries, and mutation flows one file at a time without leaking ledger
          logic into the page layer.
        </p>
      </section>

      {/* // ✅ New Code */}
      <section
        aria-label="Lease ledger summary cards"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <PlaceholderCard
          title="Outstanding balance"
          description="Backend-derived lease balance will render here."
        >
          <p className="text-2xl font-semibold text-white">—</p>
        </PlaceholderCard>

        <PlaceholderCard
          title="Current month charges"
          description="Expected rent and posted charges summary."
        >
          <p className="text-2xl font-semibold text-white">—</p>
        </PlaceholderCard>

        <PlaceholderCard
          title="Payments received"
          description="Applied and unapplied payment totals."
        >
          <p className="text-2xl font-semibold text-white">—</p>
        </PlaceholderCard>

        <PlaceholderCard
          title="Delinquency status"
          description="Aging and overdue billing signal for this lease."
        >
          <p className="text-2xl font-semibold text-white">—</p>
        </PlaceholderCard>
      </section>

      {/* // ✅ New Code */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <PlaceholderCard
            title="Charges"
            description="Posted obligations for this lease will appear here with remaining balances."
          >
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
              ChargesTable will be mounted here after the billing read contracts
              and query hooks are created.
            </div>
          </PlaceholderCard>

          <PlaceholderCard
            title="Payments"
            description="Recorded payments and unapplied amounts will appear here."
          >
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
              PaymentsTable will be mounted here after payment API and mutation
              hooks are wired.
            </div>
          </PlaceholderCard>

          <PlaceholderCard
            title="Allocations"
            description="Payment-to-charge application history will appear here."
          >
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
              AllocationsTable will be mounted here once the ledger response
              contract is fully typed.
            </div>
          </PlaceholderCard>
        </div>

        <div className="space-y-6">
          <PlaceholderCard
            title="Lease context"
            description="Header details such as tenant names, building, unit, rent, and due day."
          >
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-slate-400">Lease ID</dt>
                <dd className="font-medium text-slate-200">{leaseId}</dd>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-slate-400">Status</dt>
                <dd className="font-medium text-slate-200">Pending query</dd>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-slate-400">Rent amount</dt>
                <dd className="font-medium text-slate-200">Pending query</dd>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-slate-400">Due day</dt>
                <dd className="font-medium text-slate-200">Pending query</dd>
              </div>
            </dl>
          </PlaceholderCard>

          <PlaceholderCard
            title="Next wiring steps"
            description="Recommended implementation order to keep the billing feature stable."
          >
            <ol className="space-y-3 text-sm leading-6 text-slate-300">
              <li>1. Create billingTypes.ts</li>
              <li>2. Create billingQueryKeys.ts</li>
              <li>3. Create ledgerApi.ts</li>
              <li>4. Create useLeaseLedgerQuery.ts</li>
              <li>5. Replace these placeholders with real billing components</li>
            </ol>
          </PlaceholderCard>
        </div>
      </div>
    </main>
  );
}