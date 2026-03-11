// # Filename: src/features/leases/forms/CreateLeaseForm/CreateLeaseForm.tsx
// ✅ New Code

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
import UnitAssignmentSection from "../UnitAssignmentSection";
import { useCreateLeaseForm } from "../useCreateLeaseForm";

import {
  useLeaseOverlapUx,
  type LeaseOverlapMeta,
} from "../useLeaseOverlapUx";

import CreateLeaseCollapse from "./CreateLeaseCollapse";
import CreateLeaseHeader from "./CreateLeaseHeader";

/**
 * Launch modes supported by LeaseCreatePage
 */
export type LeaseCreateLaunchMode =
  | "blank"
  | "tenant-first"
  | "unit-first"
  | "tenant-and-unit";

/**
 * Initial launch context passed from LeaseCreatePage
 */
export type LeaseCreateInitialContext = {
  orgSlug: string;
  tenantId: number | null;
  unitId: number | null;
  buildingId: number | null;
  launchMode: LeaseCreateLaunchMode;
};

type Props = {
  initialContext: LeaseCreateInitialContext;
};

/**
 * parseApiMeta
 *
 * Safely narrows unknown normalized meta into a lease overlap meta object.
 *
 * @param meta Unknown normalized meta payload
 * @returns LeaseOverlapMeta or null
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
 * Shared lease creation workflow supporting:
 * - unit-first launch
 * - tenant-first launch
 * - combined tenant+unit launch
 * - blank/manual launch
 *
 * Responsibilities:
 * - Own open/close UI state
 * - Wire tenant workflow + building/unit assignment + lease terms
 * - Normalize API errors
 * - Submit the shared backend lease-create payload
 */
export default function CreateLeaseForm({ initialContext }: Props) {
  const { orgSlug } = useOrg();
  const navigate = useNavigate();

  const { tenantId, unitId, buildingId } = initialContext;

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
    selectedBuildingId,
    selectedUnitId,
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
    selectExistingTenant,
    onTenantModeChange,
    onBuildingChange,
    onUnitChange,
  } = useCreateLeaseForm({
    initialTenantId: tenantId,
    initialBuildingId: buildingId,
    initialUnitId: unitId,
  });

  // Step 3: Basic render guard
  const canRender = Boolean(orgSlug && orgSlug.trim().length > 0);

  const mutation = useCreateLeaseMutation({
    orgSlug: orgSlug ?? "",
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

  /**
   * handleCancel
   *
   * Resets local workflow state and closes the form.
   */
  const handleCancel = () => {
    // Step 1: Reset local workflow state
    reset();
    setHideApiErrors(false);
    setIsOpen(false);
  };

  /**
   * handleSubmit
   *
   * Validates current form state and submits a lease create request.
   */
  const handleSubmit = async () => {
    // Step 1: Re-enable API errors for a fresh submit
    setHideApiErrors(false);

    if (!orgSlug) {
      setLocalError("Organization not selected.");
      return;
    }

    const result = validate({
      unitId,
    });

    if (!result.ok) {
      return;
    }

    const { payload } = buildPayload({
      unitId,
    });

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
              Lease creation unavailable
            </p>

            <p className="text-sm text-red-200/80">
              Cannot create a lease without an organization context.
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
              Assign a tenant, select the building and unit, and define lease
              terms.
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
            selectExistingTenant={selectExistingTenant}
            onCreateDraftChange={setTenantCreateDraft}
            onTenantModeChange={onTenantModeChange}
          />

          <UnitAssignmentSection
            orgSlug={orgSlug ?? ""}
            initialBuildingId={buildingId}
            initialUnitId={unitId}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            onBuildingChange={onBuildingChange}
            onUnitChange={onUnitChange}
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