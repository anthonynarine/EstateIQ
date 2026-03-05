// # Filename: src/features/leases/forms/CreateLeaseForm.tsx


import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrg } from "../../tenancy/hooks/useOrg";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";
import { formatApiFormErrors } from "../../../api/formatApiFormErrors";
import FormErrorSummary, { FormErrorAction } from "./FormErrorSummary";
import FormActions from "./FormActions";
import LeaseTermsFields from "./LeaseTermsFields";
import TenantSection from "./TenantSection/TenantSection";
import { useCreateLeaseForm } from "./useCreateLeaseForm";

type Props = {
  unitId: number;
};

type LeaseOverlapMeta = {
  kind: "lease_overlap";
  conflict: {
    lease_id: number;
    start_date: string;
    end_date: string | null;
    status: string;
  };
  suggestedStartDate: string | null;
};

// Step 1: Format YYYY-MM-DD as "May 4, 2026" (UTC-safe)
function formatIsoDateForUi(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;

  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);

  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function withOrg(path: string, orgSlug: string | null | undefined): string {
  // Step 1: Append ?org= only when we have an org
  if (!orgSlug) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}org=${encodeURIComponent(orgSlug)}`;
}

export default function CreateLeaseForm({ unitId }: Props) {
  const { orgSlug } = useOrg();
  const navigate = useNavigate();

  // Step 1: Expand/collapse state
  const [isOpen, setIsOpen] = useState(false);

  // Step 2: Hide stale API errors after auto-fix
  const [hideApiErrors, setHideApiErrors] = useState(false);

  const {
    startDate,
    endDate,
    rentAmount,
    rentDueDay,
    securityDeposit,
    status,
    primaryTenantId,
    tenantMode,
    tenantCreateDraft,
    localError,
    setStartDate,
    setEndDate,
    setRentAmount,
    setRentDueDay,
    setSecurityDeposit,
    setStatus,
    setTenantCreateDraft,
    setLocalError,
    reset,
    validate,
    buildPayload,
    enterCreateTenantMode,
    selectExistingTenant,
  } = useCreateLeaseForm();

  const canRender =
    Boolean(orgSlug && orgSlug.trim().length > 0) && Number.isFinite(unitId);

  const mutation = useCreateLeaseMutation({
    orgSlug: orgSlug ?? "",
    unitId,
  });

  const { mutateAsync, isPending, error } = mutation;

  const normalized = error
    ? formatApiFormErrors(error)
    : { fieldErrors: {}, formErrors: [], meta: undefined };

  const fieldErrors = normalized.fieldErrors;
  const formErrors = hideApiErrors ? [] : normalized.formErrors;

  const overlapMeta: LeaseOverlapMeta | null =
    !hideApiErrors && (normalized as any)?.meta?.kind === "lease_overlap"
      ? ((normalized as any).meta as LeaseOverlapMeta)
      : null;

  const errorNotes = useMemo(() => {
    // Step 1: Status-aware explanation (includes date, formatted)
    if (!overlapMeta) return [];

    const moveOutRaw =
      overlapMeta.suggestedStartDate ?? overlapMeta.conflict.end_date ?? null;

    const moveOutPretty = moveOutRaw ? formatIsoDateForUi(moveOutRaw) : null;

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
  }, [overlapMeta]);

  const errorActions: FormErrorAction[] = useMemo(() => {
    // Step 1: Only show actions for overlap errors
    if (!overlapMeta) return [];

    const actions: FormErrorAction[] = [];

    if (overlapMeta.suggestedStartDate) {
      const suggestedPretty = formatIsoDateForUi(overlapMeta.suggestedStartDate);

      actions.push({
        key: "use_suggested_start",
        label: `Use suggested start date (${suggestedPretty})`,
        variant: "primary",
        onClick: () => {
          // Step 1: Apply suggested date (keep value as ISO for inputs)
          setStartDate(overlapMeta.suggestedStartDate as string);

          // Step 2: Clear mutation error state if supported (React Query mutations)
          if (typeof (mutation as any).reset === "function") {
            (mutation as any).reset();
          }

          // Step 3: Hide stale API errors for clean UX
          setHideApiErrors(true);
        },
      });
    }

    actions.push({
      key: "review_conflicting_lease",
      label: "Review conflicting lease",
      variant: "secondary",
      onClick: () => {
        const leaseId = overlapMeta.conflict.lease_id;
        navigate(withOrg(`/dashboard/leases/${leaseId}/ledger`, orgSlug));
      },
    });

    return actions;
  }, [navigate, orgSlug, overlapMeta, setStartDate, mutation]);

  const handleCancel = () => {
    // Step 1: reset and close
    reset();
    setHideApiErrors(false);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    // Step 1: show API errors again for fresh attempt
    setHideApiErrors(false);

    if (!orgSlug) {
      setLocalError("Organization not selected. Add ?org=<slug> to the URL.");
      return;
    }

    if (!Number.isFinite(unitId)) {
      setLocalError("Invalid unit id.");
      return;
    }

    const result = validate();
    if (!result.ok) return;

    const { payload } = buildPayload();

    try {
      await mutateAsync(payload);
      reset();
      setHideApiErrors(false);
      setIsOpen(false);
    } catch {
      // No-op: errors render via `error`
    }
  };

  if (!canRender) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        Cannot create a lease without a selected org and a valid unit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Lease</div>
          <div className="text-xs text-neutral-400">
            Create a lease for this unit (org-scoped).
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900"
        >
          {isOpen ? "Close" : "Add lease"}
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          {localError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
              {localError}
            </div>
          ) : null}

          <FormErrorSummary
            title="Validation error"
            errors={formErrors}
            actions={errorActions}
            notes={errorNotes}
          />

          <TenantSection
            orgSlug={orgSlug ?? ""}
            tenantMode={tenantMode}
            tenantId={primaryTenantId}
            tenantCreateDraft={tenantCreateDraft}
            enterCreateTenantMode={enterCreateTenantMode}
            selectExistingTenant={selectExistingTenant}
            onCreateDraftChange={setTenantCreateDraft}
          />

          <LeaseTermsFields
            startDate={startDate}
            endDate={endDate}
            rentAmount={rentAmount}
            rentDueDay={rentDueDay}
            securityDeposit={securityDeposit}
            status={status}
            onStartDateChange={(v) => {
              // Step 1: If user changes it manually, re-enable errors
              setHideApiErrors(false);
              setStartDate(v);
            }}
            onEndDateChange={setEndDate}
            onRentAmountChange={setRentAmount}
            onRentDueDayChange={setRentDueDay}
            onSecurityDepositChange={setSecurityDeposit}
            onStatusChange={setStatus}
            fieldErrors={fieldErrors}
          />

          <FormActions
            isPending={isPending}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </div>
  );
}