
// # Filename: src/features/finance/components/FinancialSummaryCard.tsx

import { useMemo } from "react";
import { useDashboardSummaryQuery, useDelinquencyQuery } from "../../../api/reportsApi";
import { useOrg } from "../../tenancy/hooks/useOrg";

// -----------------------------
// # Step 1: Small helpers
// -----------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

type StatRowProps = {
  label: string;
  value: string;
  subValue?: string;
};

function StatRow({ label, value, subValue }: StatRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="text-right">
        <div className="text-sm font-semibold text-zinc-100">{value}</div>
        {subValue ? <div className="mt-0.5 text-xs text-zinc-500">{subValue}</div> : null}
      </div>
    </div>
  );
}

// -----------------------------
// # Step 2: Component
// -----------------------------

export default function FinancialSummaryCard() {
  // Step 1: org boundary (drives query keys + enabled)
  const { orgSlug } = useOrg();

  // Step 2: fetch reports
  const summaryQuery = useDashboardSummaryQuery(orgSlug);
  const delinquencyQuery = useDelinquencyQuery(orgSlug);

  // Step 3: derive display values (keeps JSX clean)
  const derived = useMemo(() => {
    const s = summaryQuery.data;

    return {
      expected: s?.expected ?? 0,
      collected: s?.collected ?? 0,
      outstanding: s?.outstanding ?? 0,
      delinquentLeases: s?.delinquent_leases ?? 0,
      unappliedCredits: s?.unapplied_credits ?? 0,
    };
  }, [summaryQuery.data]);

  // -----------------------------
  // # Step 4: Loading / Error states
  // -----------------------------

  if (!orgSlug) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">Financial Summary</div>
        <div className="mt-2 text-sm text-zinc-400">
          Select an organization to view financial performance.
        </div>
      </div>
    );
  }

  if (summaryQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">Financial Summary</div>
        <div className="mt-2 text-sm text-zinc-400">Loading portfolio summary…</div>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">Financial Summary</div>
        <div className="mt-2 text-sm text-red-300">
          Failed to load dashboard summary.
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Where: reports dashboard-summary query
          <br />
          Why: network/auth/org-scope issue (missing/invalid X-Org-Slug or expired access token)
          <br />
          Fix: confirm org selected, then check Network → request headers include Bearer + X-Org-Slug
        </div>
      </div>
    );
  }

  // -----------------------------
  // # Step 5: Main render
  // -----------------------------

  const delinquencyAsOf = delinquencyQuery.data?.as_of;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-200">Financial Summary</div>
          <div className="mt-1 text-xs text-zinc-500">
            Org: <span className="text-zinc-300">{orgSlug}</span>
            {delinquencyAsOf ? (
              <>
                {" "}
                • Delinquency as of <span className="text-zinc-300">{delinquencyAsOf}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <StatRow
          label="Expected vs Collected"
          value={`${formatCurrency(derived.collected)} / ${formatCurrency(derived.expected)}`}
          subValue={`Outstanding: ${formatCurrency(derived.outstanding)}`}
        />

        <StatRow label="Outstanding" value={formatCurrency(derived.outstanding)} />

        <StatRow label="Delinquent Leases" value={`${derived.delinquentLeases}`} />

        <StatRow label="Unapplied Credits" value={formatCurrency(derived.unappliedCredits)} />
      </div>

      {/* Step 1: keep space for Module 3 button placement */}
      <div className="mt-4 text-xs text-zinc-500">
        Next: add “Run Rent Posting” to activate money flow.
      </div>
    </div>
  );
}