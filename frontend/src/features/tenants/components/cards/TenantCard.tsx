import { Pencil, PlusCircle, FileText } from "lucide-react";

import type { Tenant } from "../../api/types";
import TenantContactRow from "../shared/TenantContactRow";
import TenantResidenceSummary from "../shared/TenantResidenceSummary";
import TenantStatusBadge from "../shared/TenantStatusBadge";

type Props = {
  tenant: Tenant;
  onEdit: () => void;
  onCreateLease: () => void;
  onOpenLease?: () => void;
};

/**
 * TenantCard
 *
 * Mobile-first operational card for the tenant directory.
 *
 * Responsibilities:
 * - Display tenant identity and contact information.
 * - Surface active lease / residence context.
 * - Provide the most relevant workflow actions.
 *
 * UX Philosophy:
 * - Tenants exist primarily in relation to leases.
 * - If a lease exists, allow quick access to the lease.
 * - If no lease exists, prompt the landlord to create one.
 *
 * Important:
 * - Presentational component only.
 * - Does not own routing or data fetching.
 */
export default function TenantCard({
  tenant,
  onEdit,
  onCreateLease,
  onOpenLease,
}: Props) {
  // Step 1: Determine lease state
  const hasActiveLease = Boolean(tenant.active_lease);

  return (
    <article
      className="
        flex h-full flex-col rounded-3xl border border-white/10
        bg-neutral-900/70 p-4 shadow-lg transition
        hover:border-white/15 hover:bg-neutral-900/90
        sm:p-5
      "
    >
      {/* Step 2: Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-base font-semibold text-white sm:text-lg">
            {tenant.full_name}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <TenantStatusBadge status={tenant.active_lease?.status} />
          </div>
        </div>
      </div>

      {/* Step 3: Contact block */}
      <div className="mt-4 space-y-2">
        <TenantContactRow value={tenant.email} fallback="Email not provided" />
        <TenantContactRow value={tenant.phone} fallback="Phone not provided" />
      </div>

      {/* Step 4: Residence / lease context */}
      <div className="mt-4">
        <TenantResidenceSummary activeLease={tenant.active_lease} />
      </div>

      {/* Step 5: Actions */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onEdit}
          className="
            inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
            border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium
            text-neutral-100 transition hover:bg-white/10
            focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          "
        >
          <Pencil className="h-4 w-4" />
          <span>Manage Tenant</span>
        </button>

        {hasActiveLease ? (
          <button
            type="button"
            onClick={onOpenLease}
            className="
              inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
              border border-green-400/20 bg-green-500/10 px-3 py-2 text-sm
              font-medium text-green-200 transition
              hover:border-green-300/30 hover:bg-green-500/15
              focus:outline-none focus:ring-2 focus:ring-green-500/20
            "
          >
            <FileText className="h-4 w-4" />
            <span>Open Lease</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreateLease}
            className="
              inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
              border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm
              font-medium text-cyan-200 transition
              hover:border-cyan-300/30 hover:bg-cyan-500/15
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
            "
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Lease</span>
          </button>
        )}
      </div>
    </article>
  );
}