
// # Filename: src/layout/DashboardLayout.tsx

import { Outlet, Link, useLocation } from "react-router-dom";
import DashboardNav from "../components/ui/DashboardNav";
import { useAuth } from "../auth/useAuth";
import { useOrg } from "../features/tenancy/hooks/useOrg";
import OrgSwitcher from "../features/tenancy/components/OrgSwitcher";

export default function DashboardLayout() {
  const { user } = useAuth();
  const { orgSlug, orgs, isLoadingOrgs } = useOrg();

  const location = useLocation();

  // Step 1: keep current search params, add createOrg=1
  const createOrgHref = (() => {
    const params = new URLSearchParams(location.search);
    params.set("createOrg", "1");
    params.delete("org"); // important: don't keep a stale org param if org is missing
    return `/dashboard?${params.toString()}`;
  })();

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <div className="text-lg font-semibold tracking-tight">EstateIQ</div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                {user?.email || "Unknown user"}
              </span>

              <span className="text-white/30">•</span>

              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                Org: {orgSlug || "None selected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {orgs.length > 0 ? (
              <OrgSwitcher />
            ) : (
              <Link
                to={createOrgHref}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15 active:bg-white/20"
              >
                Create org
              </Link>
            )}
          </div>
        </div>

        {/* Step 2: Org-required banner */}
        {!orgSlug && (
          <div className="border-t border-white/10 bg-white/5">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-3 text-sm text-white/80">
              <span className="font-semibold text-white">Action required:</span>{" "}
              Create/select an organization to unlock Buildings, Tenants, Units, and Leases.
            </div>
          </div>
        )}

        <div className="mx-auto hidden w-full max-w-[1200px] px-4 pb-3 pt-3 md:block">
          <DashboardNav variant="top" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24">
        <Outlet />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-[1200px] px-2 py-2">
          <DashboardNav variant="bottom" />
        </div>
      </footer>
    </div>
  );
}