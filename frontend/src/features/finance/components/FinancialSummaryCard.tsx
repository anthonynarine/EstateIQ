
// # Filename: src/features/finance/components/FinancialSummaryCard.tsx

import React, { useMemo, useState } from "react";
import {
  useDashboardSummaryQuery,
  useDelinquencyQuery,
  useRunRentPostingMutation,
} from "../../../api/reportsApi";
import { useOrg } from "../../tenancy/hooks/useOrg";
import { useQueryClient } from "@tanstack/react-query";

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

  // Step 2: query client (for cross-feature invalidation)
  const queryClient = useQueryClient();

  // Step 3: fetch reports
  const summaryQuery = useDashboardSummaryQuery(orgSlug);
  const delinquencyQuery = useDelinquencyQuery(orgSlug);

  // Step 4: rent posting mutation
  const rentPostingMutation = useRunRentPostingMutation(orgSlug);

  // Step 5: local UX state (minimal, no fancy toast yet)
  const [lastRunMonth, setLastRunMonth] = useState<string | null>(null);

  // Step 6: derive display values (keeps JSX clean)
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
  // # Step 3: Event handlers
  // -----------------------------

  async function handleRunRentPosting(): Promise<void> {
    if (!orgSlug) return;

    try {
      // Step 1: run the backend job (reportsApi already invalidates dashboard + delinquency onSuccess)
      const result = await rentPostingMutation.mutateAsync();

      // Step 2: cross-feature invalidation (lease ledger lives elsewhere; use predicate)
      // Goal: invalidate anything in this org whose queryKey indicates a lease ledger.
      // This avoids importing lease queryKeys and keeps the layering clean.
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey as unknown[];

          // Key must start with ["org", orgSlug, ...]
          if (key.length < 2) return false;
          if (key[0] !== "org") return false;
          if (key[1] !== orgSlug) return false;

          // Heuristic match for "lease ledger" keys across the app
          const keyStr = key.join("|");
          const looksLikeLeaseLedger =
            keyStr.includes("lease") && keyStr.includes("ledger");

          return looksLikeLeaseLedger;
        },
      });

      // Step 3: tiny confirmation (no toast library yet)
      setLastRunMonth(result.month);
    } catch (err) {
      // Step 1: error handled by mutation state; we keep this empty on purpose
      // so we don't double-render error messages.
    }
  }

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
  const isRunning = rentPostingMutation.isPending;

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

        {/* Step 1: Money Flow Activation Button */}
        <button
          type="button"
          onClick={handleRunRentPosting}
          disabled={isRunning}
          className={[
            "rounded-xl px-3 py-2 text-sm font-semibold",
            "border border-zinc-800",
            "bg-zinc-900/40 text-zinc-100 hover:bg-zinc-900/60",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {isRunning ? "Running…" : "Run Rent Posting"}
        </button>
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

      {/* Step 2: Minimal success/error feedback */}
      <div className="mt-4 text-xs">
        {lastRunMonth ? (
          <div className="text-emerald-300">Rent posting completed for {lastRunMonth}.</div>
        ) : null}

        {rentPostingMutation.isError ? (
          <div className="text-red-300">
            Rent posting failed.
            <span className="text-zinc-500">
              {" "}
              Where: run-current-month mutation • Why: auth/org scope/backend validation • Fix:
              check Network + backend logs.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}