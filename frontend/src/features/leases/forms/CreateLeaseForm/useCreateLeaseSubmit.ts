// # Filename: src/features/leases/forms/CreateLeaseForm/useCreateLeaseSubmit.ts

import type { CreateTenantInput } from "../../../tenants/api/types";
import type { CreateLeaseWorkflowInput } from "../../queries/useCreateLeaseMutation";
import type { TenantCreateDraft, TenantMode } from "../TenantSection/tenantTypes";
import type { ValidateResult } from "./types";

type UseCreateLeaseSubmitArgs = {
  orgSlug: string | null | undefined;
  unitId: number | null | undefined;
  tenantMode: TenantMode;
  tenantCreateDraft: TenantCreateDraft;

  setLocalError: (value: string | null) => void;
  setHideApiErrors: (value: boolean) => void;
  setIsOpen: (value: boolean) => void;

  reset: () => void;

  validate: (args: { unitId: number | null | undefined }) => ValidateResult;

  buildExistingTenantPayload: (args: {
    unitId: number | null | undefined;
  }) => { payload: any };

  buildNewTenantLeasePayload: (args: {
    unitId: number | null | undefined;
  }) => { payload: any };

  mutateAsync: (input: CreateLeaseWorkflowInput) => Promise<unknown>;
};

/**
 * toCreateTenantPayload
 *
 * Normalizes tenant draft into backend payload.
 */
function toCreateTenantPayload(
  draft: TenantCreateDraft
): CreateTenantInput {
  const fullName = draft.full_name.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();

  return {
    full_name: fullName,
    email: email ? email : null,
    phone: phone ? phone : null,
  };
}

export function useCreateLeaseSubmit({
  orgSlug,
  unitId,
  tenantMode,
  tenantCreateDraft,

  setLocalError,
  setHideApiErrors,
  setIsOpen,
  reset,

  validate,
  buildExistingTenantPayload,
  buildNewTenantLeasePayload,
  mutateAsync,
}: UseCreateLeaseSubmitArgs) {
  const handleSubmit = async () => {
    // Step 1: Re-enable API errors
    setHideApiErrors(false);

    // Step 2: Require org context
    if (!orgSlug) {
      setLocalError("Organization not selected.");
      return;
    }

    // Step 3: Run validation
    const result = validate({ unitId });

    if (!result.ok) {
      return;
    }

    try {
      if (tenantMode === "select") {
        const { payload } = buildExistingTenantPayload({ unitId });

        await mutateAsync({
          mode: "existing-tenant",
          leasePayload: payload,
        });
      } else {
        const { payload } = buildNewTenantLeasePayload({ unitId });

        await mutateAsync({
          mode: "new-tenant",
          leasePayload: payload,
          tenantPayload: toCreateTenantPayload(tenantCreateDraft),
        });
      }

      // Step 4: Reset form
      reset();
      setHideApiErrors(false);
      setIsOpen(false);
    } catch {
      // API errors handled by mutation layer
    }
  };

  return { handleSubmit };
}