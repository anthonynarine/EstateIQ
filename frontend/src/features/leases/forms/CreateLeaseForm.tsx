// # Filename: src/features/leases/forms/CreateLeaseForm.tsx


import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatApiFormErrors } from "../../../api/formatApiFormErrors";
import { useOrg } from "../../tenancy/hooks/useOrg";
import FormActions from "./FormActions";
import FormErrorSummary from "./FormErrorSummary";
import LeaseTermsFields from "./LeaseTermsFields";
import TenantSection from "./TenantSection/TenantSection";
import { useCreateLeaseForm } from "./useCreateLeaseForm";
import { useLeaseOverlapUx, type LeaseOverlapMeta } from "./useLeaseOverlapUx";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";

type Props = {
  unitId: number;
};

/**
 * CreateLeaseForm
 *
 * Premium lease-creation workspace for a unit.
 *
 * Responsibilities:
 * - Own expand/collapse state
 * - Own local orchestration for create-lease submission
 * - Delegate tenant and lease-term rendering to presentational sections
 */
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
    setTenantMode,
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

  const { errorActions, errorNotes } = useLeaseOverlapUx({
    overlapMeta,
    orgSlug,
    navigate,
    setStartDate,
    mutationReset:
      typeof (mutation as any).reset === "function"
        ? (mutation as any).reset
        : null,
    setHideApiErrors,
  });

  const handleCancel = () => {
    // Step 1: Reset and close
    reset();
    setHideApiErrors(false);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    // Step 1: Show API errors again for fresh attempt
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
      // Step 2: No-op
      // Errors render through mutation.error
    }
  };

  if (!canRender) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        Cannot create a lease without a selected org and a valid unit.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Lease creation
            </p>
            <h3 className="text-xl font-semibold tracking-tight text-white">
              Lease
            </h3>
            <p className="text-sm text-neutral-400">
              Create a lease for this unit and optionally attach a tenant inline.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="w-fit rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-600 hover:bg-neutral-800"
          >
            {isOpen ? "Close" : "Add lease"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {localError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
              {localError}
            </div>
          ) : null}

          <FormErrorSummary
            title="Lease submission blocked"
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
            onTenantModeChange={setTenantMode}
          />

          <LeaseTermsFields
            startDate={startDate}
            endDate={endDate}
            rentAmount={rentAmount}
            rentDueDay={rentDueDay}
            securityDeposit={securityDeposit}
            status={status}
            onStartDateChange={(value) => {
              // Step 1: Manual change should re-enable API errors
              setHideApiErrors(false);
              setStartDate(value);
            }}
            onEndDateChange={setEndDate}
            onRentAmountChange={setRentAmount}
            onRentDueDayChange={setRentDueDay}
            onSecurityDepositChange={setSecurityDeposit}
            onStatusChange={setStatus}
            fieldErrors={fieldErrors}
          />

          <div className="border-t border-neutral-800/80 pt-5">
            <FormActions
              isPending={isPending}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}