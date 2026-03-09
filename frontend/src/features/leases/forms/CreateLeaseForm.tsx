// # Filename: src/features/leases/forms/CreateLeaseForm.tsx
// ✅ New Code

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FilePlus2,
} from "lucide-react";

import { formatApiFormErrors } from "../../../api/formatApiFormErrors";
import { useOrg } from "../../tenancy/hooks/useOrg";
import FormActions from "./FormActions";
import FormErrorSummary from "./FormErrorSummary";
import LeaseTermsFields from "./LeaseTermsFields";
import TenantSection from "./TenantSection/TenantSection";
import { useCreateLeaseForm } from "./useCreateLeaseForm";
import {
  useLeaseOverlapUx,
  type LeaseOverlapMeta,
} from "./useLeaseOverlapUx";
import { useCreateLeaseMutation } from "../queries/useCreateLeaseMutation";

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
 * UX goals:
 * - Lighter overall layout
 * - Less nested border heaviness
 * - Smoother open / close motion
 * - Mobile-first structure
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
    selectExistingTenant,
    onTenantModeChange,
  } = useCreateLeaseForm();

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

  // Step 5: Animated content classes for smoother reveal
  const animatedPanelClassName = useMemo(() => {
    return [
      "grid transition-all duration-300 ease-out",
      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
    ].join(" ");
  }, [isOpen]);

  const animatedInnerClassName = useMemo(() => {
    return [
      "min-h-0 overflow-hidden transition-all duration-300 ease-out",
      isOpen
        ? "translate-y-0 scale-100 pt-4 sm:pt-5"
        : "-translate-y-1 scale-[0.995] pt-0",
    ].join(" ");
  }, [isOpen]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
              <FilePlus2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Lease creation
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Create lease for this unit
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Assign a tenant and define lease terms for this property.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          className="
            inline-flex min-h-11 w-full items-center justify-center gap-2
            rounded-2xl border border-cyan-400/20 bg-cyan-500/10
            px-4 py-2.5 text-sm font-medium text-cyan-200 transition
            duration-200 hover:border-cyan-300/30 hover:bg-cyan-500/15
            focus:outline-none focus:ring-2 focus:ring-cyan-500/20
            sm:w-auto
          "
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-4 w-4 transition-transform duration-200" />
              <span>Close lease form</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              <span>Add lease</span>
            </>
          )}
        </button>
      </div>

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

      <div className={animatedPanelClassName}>
        <div className={animatedInnerClassName}>
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
              onTenantModeChange={onTenantModeChange}
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
        </div>
      </div>
    </section>
  );
}