// # Filename: src/pages/DashboardPage.tsx
// ✅ New Code

import React from "react";
import { Link } from "react-router-dom";

/**
 * DashboardPage (Home)
 *
 * IMPORTANT:
 * - This should be content-only.
 * - Do NOT render the top nav here.
 * - The nav belongs in DashboardLayout.tsx only.
 *
 * Purpose:
 * - Provide a clean “home” card
 * - Provide quick-entry actions to the vertical slice (Tenants + Leases)
 * - Keep links lightweight until we have full sidebar/nav + units browsing
 */
export default function DashboardPage() {
  return (
    <div className="grid gap-4">
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

          {/* Step 1: Temporary dev link until Units browsing is built */}
          <Link
            to="/dashboard/units/1/leases"
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/50"
          >
            View Unit 1 Leases (temp)
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-sm font-semibold text-zinc-200">
          What’s next (MVP path)
        </div>
        <ul className="mt-2 list-disc pl-5 text-sm text-zinc-400">
          <li>Create tenants</li>
          <li>Create a lease and attach a primary tenant</li>
          <li>Replace the temp unit link with a real Units list + selector</li>
        </ul>
      </div>
    </div>
  );
}
