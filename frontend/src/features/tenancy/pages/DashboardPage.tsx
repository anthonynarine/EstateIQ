
// # Filename: src/features/tenancy/pages/DashboardPage.tsx

import { Link, useLocation } from "react-router-dom";
import FinancialSummaryCard from "../../finance/components/FinancialSummaryCard";
import CreateOrgCard from "../components/CreateOrgCard";
import { useOrg } from "../../tenancy/hooks/useOrg";

export default function DashboardPage() {
  const location = useLocation();
  const { orgSlug } = useOrg();

  const withSearch = (path: string) => `${path}${location.search}`;
  const params = new URLSearchParams(location.search);
  const showCreateOrg = !orgSlug || params.get("createOrg") === "1";

  return (
    <div className="grid gap-4">
      {showCreateOrg && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm text-zinc-300">
            You must create/select an <span className="font-semibold text-white">organization</span>{" "}
            before you can create Buildings, Tenants, Units, or Leases.
          </div>
          <div className="mt-4">
            <CreateOrgCard />
          </div>
        </section>
      )}

      <FinancialSummaryCard />

      {/* Quick actions gated */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="text-lg font-semibold text-zinc-100">Quick actions</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orgSlug ? (
            <Link
              to={withSearch("/dashboard/tenants")}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-left transition hover:bg-zinc-900/50"
            >
              <div className="text-sm font-semibold text-zinc-100">Create tenants</div>
              <div className="mt-1 text-sm text-zinc-400">Add parties for leases.</div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4 opacity-70">
              <div className="text-sm font-semibold text-zinc-200">Create tenants</div>
              <div className="mt-1 text-sm text-zinc-400">Create/select an org first.</div>
            </div>
          )}

          {orgSlug ? (
            <Link
              to={withSearch("/dashboard/buildings")}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-left transition hover:bg-zinc-900/50"
            >
              <div className="text-sm font-semibold text-zinc-100">Add buildings</div>
              <div className="mt-1 text-sm text-zinc-400">Buildings → Units → Leases.</div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4 opacity-70">
              <div className="text-sm font-semibold text-zinc-200">Add buildings</div>
              <div className="mt-1 text-sm text-zinc-400">Create/select an org first.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}