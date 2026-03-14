// # Filename: src/features/leases/forms/EditLeaseForm/useEditLeaseSubmit.ts


import { useCallback } from "react";
import type { Lease } from "../../api/types";
import type { CreateTenantInput } from "../../../tenants/api/types";
import { useUpdateLeaseMutation } from "../../queries/useUpdateLeaseMutation";
import type { UseEditLeaseFormReturn } from "./types";

/**
 * UseEditLeaseSubmitArgs
 *
 * Input contract for the edit lease submit orchestrator.
 */
interface UseEditLeaseSubmitArgs {
  orgSlug: string;
  unitId: number;
  lease: Lease;
  form: UseEditLeaseFormReturn;
  onSuccess?: () => void;
}

/**
 * UseEditLeaseSubmitResult
 *
 * Output contract returned to the edit surface.
 */
interface UseEditLeaseSubmitResult {
  isSubmitting: boolean;
  submit: () => Promise<{ ok: true } | { ok: false; message: string }>;
}

/**
 * isValidPositiveInt
 *
 * Checks whether a value is a finite positive integer.
 *
 * @param value Candidate numeric id
 * @returns True when value is a valid positive integer
 */
function isValidPositiveInt(value: number | null | undefined): value is number {
  // Step 1: Accept only positive integers
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * buildTenantCreatePayload
 *
 * Normalizes the tenant create draft into the backend tenant-create payload.
 *
 * @param draft Edit-form tenant draft
 * @returns Normalized tenant payload
 */
function buildTenantCreatePayload(
  draft: UseEditLeaseFormReturn["tenantCreateDraft"]
): CreateTenantInput {
  // Step 1: Normalize tenant create payload
  return {
    full_name: draft.full_name.trim(),
    email: draft.email.trim() || null,
    phone: draft.phone.trim() || null,
  };
}

/**
 * useEditLeaseSubmit
 *
 * Orchestrates safe lease update workflows against the hardened backend contract.
 *
 * Responsibilities:
 * - validate edit form state
 * - choose the correct update workflow mode
 * - prevent invalid tenant-link states from reaching the API layer
 * - keep workflow branching out of LeaseCard JSX
 */
export function useEditLeaseSubmit({
  orgSlug,
  unitId,
  lease,
  form,
  onSuccess,
}: UseEditLeaseSubmitArgs): UseEditLeaseSubmitResult {
  const updateMutation = useUpdateLeaseMutation({
    orgSlug,
    unitId,
  });

  const submit = useCallback(async () => {
    // Step 1: Validate the edit form before branching workflow
    const validation = form.validate();

    if (!validation.ok) {
      return validation;
    }

    // Step 2: Build the shared lease terms patch
    const patch = form.buildTermsPatch();

    try {
      // Step 3: Terms-only update when tenant linkage is unchanged
      if (!form.requiresTenantRepair && !form.hasTenantChanged) {
        await updateMutation.mutateAsync({
          mode: "terms-only",
          leaseId: lease.id,
          patch,
        });

        onSuccess?.();
        return { ok: true as const };
      }

      // Step 4: Existing-tenant selection path
      if (form.tenantMode === "select") {
        if (!isValidPositiveInt(form.primaryTenantId)) {
          const message =
            "A valid primary tenant must be selected before updating this lease.";
          form.setLocalError(message);
          return { ok: false as const, message };
        }

        // Step 5: Legacy invalid lease repair with existing tenant
        if (form.requiresTenantRepair) {
          await updateMutation.mutateAsync({
            mode: "repair-with-existing-tenant",
            leaseId: lease.id,
            patch,
            tenantId: form.primaryTenantId,
          });

          onSuccess?.();
          return { ok: true as const };
        }

        // Step 6: Valid lease, but primary tenant changed
        await updateMutation.mutateAsync({
          mode: "replace-primary",
          leaseId: lease.id,
          patch,
          tenantId: form.primaryTenantId,
        });

        onSuccess?.();
        return { ok: true as const };
      }

      // Step 7: New-tenant path
      const tenantPayload = buildTenantCreatePayload(form.tenantCreateDraft);

      // Step 8: Legacy invalid lease repaired with new tenant
      if (form.requiresTenantRepair) {
        await updateMutation.mutateAsync({
          mode: "repair-with-new-tenant",
          leaseId: lease.id,
          patch,
          tenantPayload,
        });

        onSuccess?.();
        return { ok: true as const };
      }

      // Step 9: Valid lease replacing primary tenant by creating a new tenant first
      await updateMutation.mutateAsync({
        mode: "repair-with-new-tenant",
        leaseId: lease.id,
        patch,
        tenantPayload,
      });

      onSuccess?.();
      return { ok: true as const };
    } catch (error) {
      // Step 10: Normalize submit failure
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update the lease right now.";

      form.setLocalError(message);
      return { ok: false as const, message };
    }
  }, [form, lease.id, onSuccess, updateMutation]);

  return {
    isSubmitting: updateMutation.isPending,
    submit,
  };
}