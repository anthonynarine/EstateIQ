// # Filename: src/features/leases/forms/useLeaseOverlapUx.ts


import type { NavigateFunction } from "react-router-dom";
import type { FormErrorAction } from "./FormErrorSummary";
import { formatIsoDateLong, formatIsoDateShort } from "../utils/dateFormats";

export type LeaseOverlapMeta = {
  kind: "lease_overlap";
  conflict: {
    lease_id: number;
    start_date: string;
    end_date: string | null;
    status: string;
  };
  suggestedStartDate: string | null;
};

type Args = {
  // Step 1: Overlap meta (already normalized by formatApiFormErrors)
  overlapMeta: LeaseOverlapMeta | null;

  // Step 2: Org-safe navigation requirements
  orgSlug: string | null | undefined;
  navigate: NavigateFunction;

  // Step 3: UI callbacks
  setStartDate: (next: string) => void;

  // Step 4: Optional mutation reset hook (TanStack mutation.reset)
  mutationReset?: (() => void) | null;

  // Step 5: Hide stale API errors after auto-fix
  setHideApiErrors: (next: boolean) => void;
};

function withOrg(path: string, orgSlug: string | null | undefined): string {
  // Step 1: Append ?org= only when we have an org
  if (!orgSlug) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}org=${encodeURIComponent(orgSlug)}`;
}

/**
 * useLeaseOverlapUx
 *
 * Maps lease_overlap meta -> "notes" + "actions" for FormErrorSummary.
 * Keeps CreateLeaseForm thin and removes duplicated overlap logic.
 */
export function useLeaseOverlapUx({
  overlapMeta,
  orgSlug,
  navigate,
  setStartDate,
  mutationReset,
  setHideApiErrors,
}: Args): { errorActions: FormErrorAction[]; errorNotes: string[] } {
  // Step 1: If not an overlap scenario, return empty UI affordances
  if (!overlapMeta) {
    return { errorActions: [], errorNotes: [] };
  }

  // Step 2: Notes (status-aware explanation)
  const moveOutRaw =
    overlapMeta.suggestedStartDate ?? overlapMeta.conflict.end_date ?? null;

  const moveOutPretty = moveOutRaw ? formatIsoDateLong(moveOutRaw) : null;

  const errorNotes: string[] = (() => {
    if (overlapMeta.conflict.status === "ACTIVE") {
      return [
        moveOutPretty
          ? `This lease is still active and reserves the unit until the move-out date (${moveOutPretty}).`
          : "This lease is still active and reserves the unit until the move-out date.",
      ];
    }

    if (overlapMeta.conflict.status === "ENDED") {
      return [
        moveOutPretty
          ? `This lease is marked ended, but the move-out date still reserves the unit until ${moveOutPretty}.`
          : "This lease is marked ended, but it still reserves the unit until the move-out date.",
      ];
    }

    return [
      moveOutPretty
        ? `This lease reserves the unit until the move-out date (${moveOutPretty}).`
        : "This lease reserves the unit until the move-out date.",
    ];
  })();

  // Step 3: Actions
  const errorActions: FormErrorAction[] = [];

  if (overlapMeta.suggestedStartDate) {
    const suggestedPretty = formatIsoDateShort(overlapMeta.suggestedStartDate);

    errorActions.push({
      key: "use_suggested_start",
      label: `Use suggested start date (${suggestedPretty})`,
      variant: "primary",
      onClick: () => {
        // Step 1: Apply suggested date (keep value as ISO for inputs)
        setStartDate(overlapMeta.suggestedStartDate as string);

        // Step 2: Clear mutation error state if supported
        if (typeof mutationReset === "function") {
          mutationReset();
        }

        // Step 3: Hide stale API errors for clean UX
        setHideApiErrors(true);
      },
    });
  }

  errorActions.push({
    key: "review_conflicting_lease",
    label: "Review conflicting lease",
    variant: "secondary",
    onClick: () => {
      const leaseId = overlapMeta.conflict.lease_id;
      navigate(withOrg(`/dashboard/leases/${leaseId}/ledger`, orgSlug));
    },
  });

  return { errorActions, errorNotes };
}