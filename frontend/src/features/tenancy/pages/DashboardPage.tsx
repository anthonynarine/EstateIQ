
// # Filename: src/features/tenancy/pages/DashboardPage.tsx

import { Link, useLocation } from "react-router-dom";
import FinancialSummaryCard from "../../finance/components/FinancialSummaryCard";

/**
 * DashboardPage
 *
 * Purpose:
 * - Portfolio overview + "launcher" for the Phase 1 onboarding pipeline
 * - Keeps this page intentionally lightweight and deterministic:
 *   - dashboard shows summary + links
 *   - CRUD happens on dedicated feature pages (Buildings, Tenants, Units, Leases)
 *
 * Multi-tenant rule:
 * - Org selection is URL-canonical (`?org=<slug>`)
 * - We preserve `location.search` when navigating so org context remains stable
 *   across refreshes and deep links.
 */
export default function DashboardPage() {
  // Step 1: Preserve ?org=<slug> when linking to other dashboard routes
  const location = useLocation();

  // Step 2: Helpers to keep links consistent and avoid copy/paste mistakes
  const withSearch = (path: string) => `${path}${location.search}`;

  return (
    <div className="grid gap-4">
      {/* Step 3: Financial intelligence block */}
      <FinancialSummaryCard />

      {/* Step 4: Quick actions (mobile-first cards) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Quick actions</div>
            <div className="mt-1 text-sm text-zinc-400">
              Start building your portfolio data so reports + ledger can run deterministically.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to={withSearch("/dashboard/tenants")}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-left transition hover:bg-zinc-900/50"
          >
            <div className="text-sm font-semibold text-zinc-100">Create tenants</div>
            <div className="mt-1 text-sm text-zinc-400">
              Add people/companies first so leases can attach parties.
            </div>
          </Link>

          {/* ✅ Buildings: now enabled */}
          <Link
            to={withSearch("/dashboard/buildings")}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-left transition hover:bg-zinc-900/50"
          >
            <div className="text-sm font-semibold text-zinc-100">Add buildings</div>
            <div className="mt-1 text-sm text-zinc-400">
              Buildings → Units → Leases. Start here.
            </div>
          </Link>

          {/* Step 5: Keep placeholders until Module E/F routes exist */}
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-zinc-200">Add units</div>
            <div className="mt-1 text-sm text-zinc-400">
              Units unlock leases, ledger views, and rent posting.
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-zinc-200">Create leases</div>
            <div className="mt-1 text-sm text-zinc-400">
              Once units exist, you’ll create leases and attach tenants.
            </div>
          </div>
        </div>
      </section>

      {/* Step 6: MVP checklist (keeps you honest + deterministic) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">MVP pipeline checklist</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
          <li>Create org → select org</li>
          <li>Create building → units</li>
          <li>Create tenant</li>
          <li>Create lease (attach primary tenant)</li>
          <li>Run rent posting</li>
          <li>Open lease ledger</li>
          <li>Record payment (allocation_mode=auto)</li>
          <li>Verify dashboard + delinquency update</li>
        </ol>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3 text-sm text-zinc-300">
          Tip: We removed the temporary “Unit 1 leases” link because it will 404 until you have real
          units. Next module will add a Units list + “View Leases” button for real unit IDs.
        </div>
      </section>
    </div>
  );
}