
// # Filename: src/features/tenancy/pages/DashboardPage.tsx

import { Link } from "react-router-dom";
import FinancialSummaryCard from "../../finance/components/FinancialSummaryCard";

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      {/* Step 1: Financial intelligence block */}
      <FinancialSummaryCard />

      {/* Step 2: Existing dashboard content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-xl font-semibold text-zinc-100">Dashboard</div>
        <div className="mt-2 text-sm text-zinc-400">
          Welcome back. Use the navigation to manage tenants and leases.
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/dashboard/tenants"
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/50"
          >
            Manage Tenants
          </Link>

          <Link
            to="/dashboard/units/1/leases"
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/50"
          >
            View Unit 1 Leases (temp)
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">What’s next (MVP path)</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-zinc-400">
          <li>Create tenants</li>
          <li>Create a lease and attach a primary tenant</li>
          <li>Replace the temp unit link with a real Units list + selector</li>
        </ul>
      </div>
    </div>
  );
}