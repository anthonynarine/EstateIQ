// # Filename: src/features/tenants/components/TenantCard.tsx
// ✅ New Code

import { Building2, FileText, Mail, Pencil, Phone, PlusCircle, User2 } from "lucide-react";
import type { Tenant } from "../api/types";

type TenantResidenceSummary = {
  buildingLabel?: string | null;
  unitLabel?: string | null;
  leaseStatus?: string | null;
  moveInDate?: string | null;
};

type Props = {
  tenant: Tenant;
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onCreateLease: (tenant: Tenant) => void;
  residenceSummary?: TenantResidenceSummary | null;
};

/**
 * formatDisplayDate
 *
 * Formats an ISO date string into a readable local date.
 */
function formatDisplayDate(value?: string | null): string | null {
  // Step 1: Guard empty value
  if (!value) {
    return null;
  }

  // Step 2: Parse date
  const parsed = new Date(value);

  // Step 3: Guard invalid dates
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Step 4: Format safely
  return parsed.toLocaleDateString();
}

/**
 * getLeaseBadgeStyles
 *
 * Resolves badge styling based on lease status.
 */
function getLeaseBadgeStyles(status?: string | null): string {
  // Step 1: Normalize
  const normalized = status?.trim().toLowerCase();

  // Step 2: Map style
  switch (normalized) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "draft":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "ended":
      return "border-neutral-700 bg-neutral-900 text-neutral-300";
    default:
      return "border-neutral-700 bg-neutral-900 text-neutral-300";
  }
}

/**
 * getLeaseLabel
 *
 * Converts optional lease status into a user-facing label.
 */
function getLeaseLabel(status?: string | null): string {
  // Step 1: Normalize
  const normalized = status?.trim().toLowerCase();

  // Step 2: Map to display label
  switch (normalized) {
    case "active":
      return "Active lease";
    case "draft":
      return "Draft lease";
    case "ended":
      return "Lease ended";
    default:
      return "No active lease";
  }
}

/**
 * TenantCard
 *
 * Presentational card for the tenant directory.
 *
 * Responsibilities:
 * - Display tenant identity and contact information
 * - Show residence and lease summary when available
 * - Expose workflow actions:
 *   - view
 *   - edit
 *   - create lease
 *
 * Non-responsibilities:
 * - No API calls
 * - No query logic
 * - No route logic
 */
export default function TenantCard({
  tenant,
  onView,
  onEdit,
  onCreateLease,
  residenceSummary = null,
}: Props) {
  // Step 1: Defensive display values
  const fullName = tenant.full_name?.trim() || `Tenant #${tenant.id}`;
  const email = tenant.email?.trim() || null;
  const phone = tenant.phone?.trim() || null;

  // Step 2: Optional derived residence context
  const buildingLabel = residenceSummary?.buildingLabel?.trim() || null;
  const unitLabel = residenceSummary?.unitLabel?.trim() || null;
  const leaseStatus = residenceSummary?.leaseStatus?.trim() || null;
  const moveInDate = formatDisplayDate(residenceSummary?.moveInDate);

  // Step 3: Determine residence display
  const hasResidence = Boolean(buildingLabel || unitLabel || leaseStatus || moveInDate);

  return (
    <article className="rounded-3xl border border-neutral-800/80 bg-neutral-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-neutral-700 hover:bg-neutral-900/60">
      {/* Step 4: Top identity section */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-300">
              <User2 size={18} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-tight text-white">
                {fullName}
              </h3>

              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                    getLeaseBadgeStyles(leaseStatus),
                  ].join(" ")}
                >
                  {getLeaseLabel(leaseStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 5: Contact section */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <Mail className="mt-0.5 shrink-0 text-neutral-500" size={16} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Email
            </p>
            <p className="mt-1 truncate text-sm text-neutral-200">
              {email ?? "Not provided"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <Phone className="mt-0.5 shrink-0 text-neutral-500" size={16} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Phone
            </p>
            <p className="mt-1 truncate text-sm text-neutral-200">
              {phone ?? "Not provided"}
            </p>
          </div>
        </div>
      </div>

      {/* Step 6: Residence summary */}
      <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-neutral-500" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            Current residence
          </p>
        </div>

        {hasResidence ? (
          <div className="mt-3 space-y-2 text-sm text-neutral-300">
            <p>
              <span className="text-neutral-500">Building:</span>{" "}
              {buildingLabel ?? "—"}
            </p>
            <p>
              <span className="text-neutral-500">Unit:</span>{" "}
              {unitLabel ?? "—"}
            </p>
            <p>
              <span className="text-neutral-500">Lease:</span>{" "}
              {getLeaseLabel(leaseStatus)}
            </p>
            <p>
              <span className="text-neutral-500">Move-in:</span>{" "}
              {moveInDate ?? "—"}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 p-3">
            <p className="text-sm text-neutral-400">
              This tenant does not currently have an active residence summary.
              Create a lease to assign them to a building and unit.
            </p>
          </div>
        )}
      </div>

      {/* Step 7: Action row */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-4">
        <button
          type="button"
          onClick={() => onView(tenant)}
          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <FileText size={16} />
          View
        </button>

        <button
          type="button"
          onClick={() => onEdit(tenant)}
          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <Pencil size={16} />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onCreateLease(tenant)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <PlusCircle size={16} />
          Create lease
        </button>
      </div>
    </article>
  );
}