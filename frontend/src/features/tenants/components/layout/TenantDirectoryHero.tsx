// # Filename: src/features/tenants/components/layout/TenantDirectoryHero.tsx
// ✅ New Code

import { Link } from "react-router-dom";
import { Building2, Users } from "lucide-react";

type Props = {
  orgSlug?: string;
  isMissingOrg?: boolean;
};

/**
 * TenantDirectoryHero
 *
 * Top hero surface for the tenant directory route.
 *
 * Responsibilities:
 * - Title + subtitle
 * - Org badge
 * - Back-to-dashboard action
 *
 * Important:
 * - This component is presentational only.
 * - It does not own route state, query state, or mutations.
 */
export default function TenantDirectoryHero({
  orgSlug = "",
  isMissingOrg = false,
}: Props) {
  if (isMissingOrg) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/70">
              Tenant workspace
            </p>

            <h1 className="text-lg font-semibold text-white sm:text-xl">
              Tenant Directory
            </h1>

            <p className="max-w-2xl text-sm leading-6 text-neutral-300">
              No organization is currently selected. Open this page from an
              org-scoped dashboard route so the tenant directory can load
              safely.
            </p>

            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 shadow-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
            <Users className="h-5 w-5" />
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Leasing
            </p>

            <h1 className="text-lg font-semibold text-white sm:text-xl">
              Tenant Directory
            </h1>

            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Manage reusable tenant records for this organization. This is the
              launch point for lease assignment, tenant lookup, and contact
              workflows.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
            Org: {orgSlug}
          </span>

          <Link
            to={`/dashboard?org=${orgSlug}`}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}