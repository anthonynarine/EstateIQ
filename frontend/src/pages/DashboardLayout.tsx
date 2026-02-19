// # Filename: src/pages/DashboardLayout.tsx
// ✅ New Code

import React, { useMemo } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import OrgSwitcher from "../org/OrgSwitcher";
import { useOrg } from "../org/useOrg";

import CreateOrgCard from "../org/components/CreateOrgCard";
import { useOrgsQuery } from "../org/queries/useOrgsQuery";

/**
 * DashboardLayout
 *
 * Production dashboard shell:
 * - Centralizes org onboarding (CreateOrgCard if no orgs exist)
 * - Provides consistent header + content container
 * - Ensures nested dashboard routes render through <Outlet />
 *
 * Why:
 * - Nearly all endpoints require X-Org-Slug
 * - If user has no org, feature pages will 403/empty
 * - This keeps feature pages lean and predictable
 */
export default function DashboardLayout() {
  // Step 1: Fetch org list (server state)
  const orgsQuery = useOrgsQuery();
  const orgs = orgsQuery.data ?? [];

  // Step 2: Read active org selection (client state)
  const orgCtx = useOrg();
  const orgSlug = orgCtx.orgSlug;

  // Step 3: Resolve active org name for display
  const activeOrgName = useMemo(() => {
    if (!orgSlug) return "";
    const found = orgs.find((o) => o.slug === orgSlug);
    return found?.name ?? "";
  }, [orgSlug, orgs]);

  // Step 4: Loading state
  if (orgsQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-lg font-semibold text-zinc-100">
              Loading dashboard…
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Fetching organizations…
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Empty-org onboarding
  if (orgs.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <CreateOrgCard />
        </div>
      </div>
    );
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "rounded-lg px-2 py-1 text-sm transition",
      isActive
        ? "bg-zinc-900/50 text-zinc-100 border border-zinc-800"
        : "text-zinc-300 hover:bg-zinc-900/30 hover:text-zinc-100",
    ].join(" ");

  // Step 6: Normal dashboard shell
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link to="/dashboard" className="text-base font-semibold text-zinc-100">
                EstateIQ
              </Link>
              <div className="mt-1 truncate text-xs text-zinc-500">
                Active org:{" "}
                <span className="text-zinc-200">
                  {activeOrgName || orgSlug || "not selected"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <OrgSwitcher />
            </div>
          </div>

          {/* ✅ New Code: Nav row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <NavLink to="/dashboard" end className={navLinkClass}>
              Dashboard
            </NavLink>

            <NavLink to="/dashboard/tenants" className={navLinkClass}>
              Tenants
            </NavLink>

            {/* Step 1: Temporary link until Units browsing exists */}
            <NavLink to="/dashboard/units/1/leases" className={navLinkClass}>
              Unit Leases (temp)
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
