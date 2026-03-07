// # Filename: src/features/tenants/components/shared/TenantResidenceSummary.tsx


import { Building2, Home } from "lucide-react";

import type { TenantActiveLeaseSummary } from "../../api/types";

type Props = {
  activeLease: TenantActiveLeaseSummary | null;
};

/**
 * getResidenceLine
 *
 * Builds a concise residence summary from the active lease object.
 */
function getResidenceLine(activeLease: TenantActiveLeaseSummary | null): string {
  if (!activeLease) {
    return "Not currently assigned to a building or unit.";
  }

  const buildingLabel = activeLease.building?.label;
  const unitLabel = activeLease.unit?.label;

  if (buildingLabel && unitLabel) {
    return `${buildingLabel} • Unit ${unitLabel}`;
  }

  if (buildingLabel) {
    return buildingLabel;
  }

  if (unitLabel) {
    return `Unit ${unitLabel}`;
  }

  return "Active lease exists, but residence details are unavailable.";
}

/**
 * getMoveInLine
 *
 * Formats the active lease start date for display.
 */
function getMoveInLine(startDate: string | null | undefined): string {
  if (!startDate) {
    return "Move-in date unavailable";
  }

  const parsedDate = new Date(startDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Move-in date unavailable";
  }

  return `Move-in: ${parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
}

/**
 * TenantResidenceSummary
 *
 * Presentational block for tenant residence and lease-derived occupancy context.
 *
 * Responsibilities:
 * - Show where the tenant currently lives based on the active lease summary.
 * - Show a move-in line when available.
 * - Show a clear fallback when the tenant has no active lease.
 *
 * Important:
 * - This is lease-derived UI, not tenant-owned data.
 * - This component is presentational only.
 */
export default function TenantResidenceSummary({ activeLease }: Props) {
  const hasActiveLease = Boolean(activeLease);
  const residenceLine = getResidenceLine(activeLease);
  const moveInLine = getMoveInLine(activeLease?.start_date);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Residence
            </p>
            <p className="mt-1 text-sm leading-5 text-neutral-200">
              {residenceLine}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Lease Context
            </p>
            <p className="mt-1 text-sm leading-5 text-neutral-400">
              {hasActiveLease
                ? moveInLine
                : "Create a lease to assign this tenant to a unit."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}