// # Filename: src/features/leases/forms/CreateLeaseForm.tsx

import { useState } from "react";
import { useOrg } from "../../tenancy/hooks/useOrg";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";
import { formatApiFormErrors } from "../../../api/formatApiFormerrors";
import FormErrorSummary from "./FormErrorSummary";
import FormActions from "./FormActions";
import LeaseTermsFields from "./LeaseTermsFields";
import TenantSection from "./TenantSection/TenantSection";
import { useCreateLeaseForm } from "./useCreateLeaseForm";

type Props = {
  unitId: number;
};

/**
 * CreateLeaseForm
 *
 * Expandable, org-scoped form that creates a lease for a specific unit.
 *
 * Responsibilities:
 * - Orchestrate the UI flow (open/close) and submission pipeline
 * - Delegate state/validation/payload building to `useCreateLeaseForm`
 * - Call the lease creation mutation (TanStack Query)
 * - Render normalized DRF errors and fast client validation feedback
 *
 * Non-responsibilities:
 * - Tenant directory fetching (TenantSelect owns this)
 * - Tenant creation orchestration (POST tenant → POST lease) — coming next
 */
export default function CreateLeaseForm({ unitId }: Props) {
  const { orgSlug } = useOrg();

  // Step 1: Expand/collapse state
  const [isOpen, setIsOpen] = useState(false);

  // Step 2: Form state + validation + payload builder
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

  // Step 3: Guardrails
  const canRender =
    Boolean(orgSlug && orgSlug.trim().length > 0) && Number.isFinite(unitId);

  // Step 4: Mutation hook (org-scoped invalidation happens inside the hook)
  const { mutateAsync, isPending, error } = useCreateLeaseMutation({
    orgSlug: orgSlug ?? "",
    unitId,
  });

  // Step 5: Canonical API error normalization
  const { fieldErrors, formErrors } = error
    ? formatApiFormErrors(error)
    : { fieldErrors: {}, formErrors: [] };

  const handleCancel = () => {
    // Step 1: reset and close
    reset();
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    // Step 1: Validate org boundary (avoid confusing 401s)
    if (!orgSlug) {
      setLocalError("Organization not selected. Add ?org=<slug> to the URL.");
      return;
    }

    // Step 2: Validate unit boundary
    if (!Number.isFinite(unitId)) {
      setLocalError("Invalid unit id.");
      return;
    }

    // Step 3: Client-side validation (includes create-tenant name check)
    const result = validate();
    if (!result.ok) return;

    // Step 4: Build lease payload (parties included only for select mode)
    const { payload } = buildPayload();

    // Step 5: Execute mutation (tenant creation orchestration is next milestone)
    try {
      await mutateAsync(payload);
      reset();
      setIsOpen(false);
    } catch {
      // Step 6: No-op (errors are rendered via `error`)
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
      {/* Header */}
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

      {/* Expandable form */}
      {isOpen ? (
        <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          {/* Local Error */}
          {localError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
              {localError}
            </div>
          ) : null}

          {/* API Errors */}
          <FormErrorSummary title="Validation error" errors={formErrors} />

          {/* ✅ New Code: Tenant section wired to hook */}
          <TenantSection
            orgSlug={orgSlug ?? ""}
            tenantMode={tenantMode}
            tenantId={primaryTenantId}
            tenantCreateDraft={tenantCreateDraft}
            enterCreateTenantMode={enterCreateTenantMode}
            selectExistingTenant={selectExistingTenant}
            onCreateDraftChange={setTenantCreateDraft}
          />

          {/* Lease term fields */}
          <LeaseTermsFields
            startDate={startDate}
            endDate={endDate}
            rentAmount={rentAmount}
            rentDueDay={rentDueDay}
            securityDeposit={securityDeposit}
            status={status}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onRentAmountChange={setRentAmount}
            onRentDueDayChange={setRentDueDay}
            onSecurityDepositChange={setSecurityDeposit}
            onStatusChange={setStatus}
            fieldErrors={fieldErrors}
          />

          {/* Actions */}
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