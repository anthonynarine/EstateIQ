// # Filename: src/features/finance/pages/LeaseLedgerPage.tsx

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrg } from "../../tenancy/hooks/useOrg";
import { useLeaseLedgerQuery } from "../../../api/leaseApi";
import PaymentCreateModal from "../components/PaymentCreateModal";

// -----------------------------
// # Step 1: Helpers
// -----------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function parseLeaseId(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return -1;
  return n;
}

// -----------------------------
// # Step 2: Page (NO PROPS)
// -----------------------------

export default function LeaseLedgerPage() {
  // Step 1: lease id from URL
  const { leaseId: leaseIdParam } = useParams();
  const leaseId = useMemo(() => parseLeaseId(leaseIdParam), [leaseIdParam]);

  // Step 2: org slug from org context
  const { orgSlug } = useOrg();

  // Step 3: fetch ledger
  const ledgerQuery = useLeaseLedgerQuery({
    orgSlug,
    leaseId,
  });

  // Step 4: modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // -----------------------------
  // # Step 3: Guard rails
  // -----------------------------

  if (!orgSlug) {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-lg font-semibold text-zinc-100">Lease Ledger</div>
          <div className="mt-2 text-sm text-zinc-400">
            Select an organization to view lease ledger.
          </div>
        </div>
      </div>
    );
  }

  if (leaseId <= 0) {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-red-900/40 bg-zinc-950 p-5">
          <div className="text-lg font-semibold text-zinc-100">Lease Ledger</div>
          <div className="mt-2 text-sm text-red-300">Invalid lease id in URL.</div>
          <div className="mt-2 text-xs text-zinc-500">
            Where: route param <code className="text-zinc-300">:leaseId</code>
            <br />
            Why: URL param is missing or not a number
            <br />
            Fix: navigate from a lease list using a valid lease id
          </div>
        </div>

        <Link
          to="/dashboard"
          className="w-fit rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // -----------------------------
  // # Step 4: Main render
  // -----------------------------

  const balance = ledgerQuery.data?.balance ?? 0;
  const rows = ledgerQuery.data?.rows ?? [];

  return (
    <div className="grid gap-4">
      {/* Step 1: Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Lease Ledger</div>
            <div className="mt-1 text-xs text-zinc-500">
              Org: <span className="text-zinc-300">{orgSlug}</span> • Lease ID:{" "}
              <span className="text-zinc-300">{leaseId}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900/60"
            >
              Record Payment
            </button>

            <Link
              to="/dashboard"
              className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/40"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2">
            <div className="text-xs text-zinc-500">Balance</div>
            <div className="text-sm font-semibold text-zinc-100">{formatCurrency(balance)}</div>
          </div>
        </div>
      </div>

      {/* Step 2: Content states */}
      {ledgerQuery.isLoading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
          Loading ledger…
        </div>
      ) : null}

      {ledgerQuery.isError ? (
        <div className="rounded-2xl border border-red-900/40 bg-zinc-950 p-5">
          <div className="text-sm font-semibold text-zinc-200">Failed to load ledger</div>
          <div className="mt-2 text-xs text-zinc-500">
            Where: GET /api/v1/leases/{leaseId}/ledger/
            <br />
            Why: auth/org-scope issue (missing/invalid X-Org-Slug) or backend error
            <br />
            Fix: check Network headers include Bearer + X-Org-Slug, then check backend logs
          </div>
        </div>
      ) : null}

      {/* Step 3: Ledger table */}
      {!ledgerQuery.isLoading && !ledgerQuery.isError ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold text-zinc-200">Transactions</div>

          {rows.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-400">No ledger activity yet.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3 text-right">Applied</th>
                    <th className="py-2 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={String(r.id)} className="border-b border-zinc-900/60 text-sm">
                      <td className="py-2 pr-3 text-zinc-300">{r.date}</td>
                      <td className="py-2 pr-3 text-zinc-300">{r.type}</td>
                      <td className="py-2 pr-3 text-zinc-300">{r.description ?? "—"}</td>
                      <td className="py-2 pr-3 text-right text-zinc-100">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-2 pr-3 text-right text-zinc-300">
                        {typeof r.applied_amount === "number"
                          ? formatCurrency(r.applied_amount)
                          : "—"}
                      </td>
                      <td className="py-2 text-right text-zinc-300">
                        {typeof r.remaining_amount === "number"
                          ? formatCurrency(r.remaining_amount)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Step 4: Payment modal */}
      <PaymentCreateModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        leaseId={leaseId}
      />
    </div>
  );
}