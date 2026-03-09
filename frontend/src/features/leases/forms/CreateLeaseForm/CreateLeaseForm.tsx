// # Filename: src/features/leases/forms/CreateLeaseForm/CreateLeaseForm.tsx


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { formatApiFormErrors } from "../../../../api/formatApiFormErrors";
import { useOrg } from "../../../tenancy/hooks/useOrg";
import { useCreateLeaseMutation } from "../../queries/useCreateLeaseMutation";
import FormActions from "../FormActions";
import FormErrorSummary from "../FormErrorSummary";
import LeaseTermsFields from "../LeaseTermsFields";
import TenantSection from "../TenantSection/TenantSection";
import { useTenantModeActions } from "../TenantSection/useTenantModeActions";
import { useCreateLeaseForm } from "../useCreateLeaseForm";
import {
  useLeaseOverlapUx,
  type LeaseOverlapMeta,
} from "../useLeaseOverlapUx";
import CreateLeaseCollapse from "./CreateLeaseCollapse";
import CreateLeaseHeader from "./CreateLeaseHeader";

type Props = {
  unitId: number;
};

/**
 * parseApiMeta
 *
 * Safely narrows unknown normalized meta into a lease overlap meta object.
 *
 * @param meta Unknown normalized meta payload.
 * @returns LeaseOverlapMeta or null.
 */
function parseApiMeta(meta: unknown): LeaseOverlapMeta | null {
  // Step 1: Guard non-object values
  if (!meta || typeof meta !== "object") {
    return null;
  }

  // Step 2: Safely inspect kind
  const maybeMeta = meta as { kind?: unknown };
  if (maybeMeta.kind !== "lease_overlap") {
    return null;
  }

  // Step 3: Return typed overlap meta
  return meta as LeaseOverlapMeta;
}

/**
 * CreateLeaseForm
 *
 * Premium unit-first lease creation workflow.
 *
 * Responsibilities:
 * - Orchestrate unit-scoped lease creation
 * - Own open/close UI state
 * - Normalize API errors
 * - Wire tenant workflow + lease terms + footer actions
 *
 * Design goals:
 * - Keep this file as an orchestrator
 * - Push UI blocks into extracted components
 * - Stay mobile-first and easy to maintain
 */
export default function CreateLeaseForm({ unitId }: Props) {
  const { orgSlug } = useOrg();
  const navigate = useNavigate();

  // Step 1: Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [hideApiErrors, setHideApiErrors] = useState(false);

  // Step 2: Controlled form state
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
    enterSelectTenantMode,
    selectExistingTenant,
  } = useCreateLeaseForm();

  const { handleTenantModeChange } = useTenantModeActions({
    enterCreateTenantMode,
    enterSelectTenantMode,
  });

  // Step 3: Basic render guard
  const canRender =
    Boolean(orgSlug && orgSlug.trim().length > 0) && Number.isFinite(unitId);

  const mutation = useCreateLeaseMutation({
    orgSlug: orgSlug ?? "",
    unitId,
  });

  const { mutateAsync, isPending, error } = mutation;

  // Step 4: Normalize API errors
  const normalized = error
    ? formatApiFormErrors(error)
    : { fieldErrors: {}, formErrors: [], meta: undefined };

  const fieldErrors = normalized.fieldErrors;
  const formErrors = hideApiErrors ? [] : normalized.formErrors;
  const overlapMeta = hideApiErrors ? null : parseApiMeta(normalized.meta);

  const { errorActions, errorNotes } = useLeaseOverlapUx({
    overlapMeta,
    orgSlug,
    navigate,
    setStartDate,
    mutationReset:
      typeof mutation.reset === "function" ? mutation.reset : null,
    setHideApiErrors,
  });

  const handleCancel = () => {
    // Step 1: Reset local workflow state
    reset();
    setHideApiErrors(false);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    // Step 1: Re-enable API errors for a fresh submit
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
    if (!result.ok) {
      return;
    }

    const { payload } = buildPayload();

    try {
      await mutateAsync(payload);
      reset();
      setHideApiErrors(false);
      setIsOpen(false);
    } catch {
      // Step 2: No-op
      // Errors are rendered from mutation.error.
    }
  };

  if (!canRender) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-100">
              Lease creation is unavailable
            </p>
            <p className="text-sm text-red-200/80">
              Cannot create a lease without a selected organization and a valid
              unit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <CreateLeaseHeader
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
      />

      {!isOpen ? (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-emerald-200">
              Ready to create a lease
            </p>
            <p className="text-sm text-neutral-400">
              Open the form to assign a tenant and enter lease terms for this
              unit.
            </p>
          </div>
        </div>
      ) : null}

      <CreateLeaseCollapse isOpen={isOpen}>
        <div className="space-y-4 border-t border-white/10">
          {localError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <p>{localError}</p>
              </div>
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
            onTenantModeChange={handleTenantModeChange}
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

          <div className="border-t border-white/10 pt-4 sm:pt-5">
            <FormActions
              isPending={isPending}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </CreateLeaseCollapse>
    </section>
  );
}