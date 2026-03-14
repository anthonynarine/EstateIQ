// # Filename: src/features/leases/components/LeaseCard/LeaseTenantPanel.tsx


import { AlertTriangle, ShieldCheck, UserRound } from "lucide-react";
import type { LeaseStatus } from "../../api/types";

interface LeaseTenantPanelProps {
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  leaseStatus: LeaseStatus;
  missingPrimaryTenant: boolean;
}

/**
 * LeaseTenantPanel
 *
 * Presentational panel for the authoritative primary tenant attached to a lease.
 * Uses parties_detail-derived data only.
 */
export default function LeaseTenantPanel({
  tenantName,
  tenantEmail,
  tenantPhone,
  leaseStatus,
  missingPrimaryTenant,
}: LeaseTenantPanelProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        missingPrimaryTenant
          ? "border-amber-500/20 bg-amber-500/[0.05]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <div
          className={`rounded-xl p-2 ${
            missingPrimaryTenant
              ? "bg-amber-500/10"
              : leaseStatus === "active"
              ? "bg-emerald-500/10"
              : "bg-white/5"
          }`}
        >
          {missingPrimaryTenant ? (
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          ) : (
            <UserRound
              className={`h-4 w-4 ${
                leaseStatus === "active"
                  ? "text-emerald-300"
                  : "text-neutral-200"
              }`}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">
            Primary tenant
          </p>

          <p
            className={`mt-1 text-sm font-semibold ${
              missingPrimaryTenant ? "text-amber-200" : "text-white"
            }`}
          >
            {tenantName}
          </p>

          {!missingPrimaryTenant ? (
            <div className="mt-2 space-y-1 text-xs text-neutral-400">
              {tenantEmail ? <p className="truncate">{tenantEmail}</p> : null}
              {tenantPhone ? <p>{tenantPhone}</p> : null}
              {!tenantEmail && !tenantPhone ? (
                <p>No contact info added yet.</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-200/90">
              This lease record is missing its authoritative primary tenant
              linkage and should be repaired.
            </p>
          )}
        </div>

        {!missingPrimaryTenant && leaseStatus === "active" ? (
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active tenant attached
          </div>
        ) : null}
      </div>
    </div>
  );
}