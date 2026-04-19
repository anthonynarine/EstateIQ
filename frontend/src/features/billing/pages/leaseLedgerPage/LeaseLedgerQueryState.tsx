// # Filename: src/features/billing/pages/leaseLedgerPage/LeaseLedgerQueryState.tsx


/**
 * MissingLeaseIdStateProps
 *
 * Props for the missing lease-id state.
 */
interface MissingLeaseIdStateProps {
  kind: "missing_lease_id";
}

/**
 * OrgWarningStateProps
 *
 * Props for the org-slug warning state.
 */
interface OrgWarningStateProps {
  kind: "org_warning";
}

/**
 * QueryErrorStateProps
 *
 * Props for the query-error state.
 */
interface QueryErrorStateProps {
  kind: "query_error";
  message: string;
  onRetry: () => void;
}

/**
 * LeaseLedgerQueryStateProps
 *
 * Union props for the lease-ledger query-state renderer.
 */
type LeaseLedgerQueryStateProps =
  | MissingLeaseIdStateProps
  | OrgWarningStateProps
  | QueryErrorStateProps;

/**
 * LeaseLedgerQueryState
 *
 * Focused state renderer for route and query-related lease-ledger UI states.
 *
 * Responsibilities:
 * - render the missing lease-id route state
 * - render the org-scoping warning state
 * - render the retryable query-error state
 *
 * Important:
 * This component does not fetch data, resolve the org, or own query logic.
 * It only renders state-specific UI so the page stays orchestration-focused.
 *
 * @param props State-specific rendering props.
 * @returns The appropriate lease-ledger query-state UI.
 */
export default function LeaseLedgerQueryState(
  props: LeaseLedgerQueryStateProps,
) {
  if (props.kind === "missing_lease_id") {
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

  if (props.kind === "org_warning") {
    return (
      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
        <p className="text-sm leading-6 text-amber-100">
          No active organization slug was found in client storage. The shared
          axios layer may still provide org scoping, but this should be wired to
          the real Org context next so billing queries stay explicit.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-100">{props.message}</p>

          <p className="mt-1 text-xs leading-5 text-rose-200/90">
            The ledger response should provide lease context, totals, charges,
            payments, and allocations so this workspace can stay backend-driven
            and deterministic.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-50 transition hover:bg-rose-300/15"
          onClick={props.onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    </section>
  );
}