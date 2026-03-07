// # Filename: src/features/tenants/components/cards/TenantCard.tsx


import { Eye, Pencil, PlusCircle } from "lucide-react";

import type { Tenant } from "../../api/types";
import TenantContactRow from "../shared/TenantContactRow";
import TenantResidenceSummary from "../shared/TenantResidenceSummary";
import TenantStatusBadge from "../shared/TenantStatusBadge";

type Props = {
  tenant: Tenant;
  onView: () => void;
  onEdit: () => void;
  onCreateLease: () => void;
};

/**
 * TenantCard
 *
 * Mobile-first operational card for the tenant directory.
 *
 * Responsibilities:
 * - Display core tenant identity and contact information.
 * - Surface derived active lease / residence context.
 * - Provide clear workflow actions.
 *
 * Important:
 * - This component is presentational.
 * - It does not fetch data or own navigation state.
 */
export default function TenantCard({
  tenant,
  onView,
  onEdit,
  onCreateLease,
}: Props) {
  return (
    <article
      className="
        flex h-full flex-col rounded-3xl border border-white/10
        bg-neutral-900/70 p-4 shadow-lg transition
        hover:border-white/15 hover:bg-neutral-900/90
        sm:p-5
      "
    >
      {/* Step 1: Header */}
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

      {/* Step 2: Contact block */}
      <div className="mt-4 space-y-2">
        <TenantContactRow value={tenant.email} fallback="Email not provided" />
        <TenantContactRow value={tenant.phone} fallback="Phone not provided" />
      </div>

      {/* Step 3: Residence / lease context */}
      <div className="mt-4">
        <TenantResidenceSummary activeLease={tenant.active_lease} />
      </div>

      {/* Step 4: Actions */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onView}
          className="
            inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl
            border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium
            text-neutral-100 transition hover:bg-white/10
            focus:outline-none focus:ring-2 focus:ring-cyan-500/20
          "
        >
          <Eye className="h-4 w-4" />
          <span>View</span>
        </button>

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
          <span>Edit</span>
        </button>

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
      </div>
    </article>
  );
}