// # Filename: src/features/leases/queries/useUpdateLeaseMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenant } from "../../tenants/api/tenantsApi";
import type { CreateTenantInput } from "../../tenants/api/types";
import { updateLease } from "../api/leaseApi";
import type { Lease, UpdateLeaseInput } from "../api/types";
import { leasesByUnitQueryKey } from "./useLeasesByUnitQuery";

/**
 * UseUpdateLeaseMutationArgs
 *
 * Shared mutation args for lease update workflows.
 */
type UseUpdateLeaseMutationArgs = {
  orgSlug: string;
  unitId: number;
};

/**
 * TermsOnlyUpdateInput
 *
 * Safe when the current primary tenant remains unchanged.
 * Do not send parties in this mode.
 */
type TermsOnlyUpdateInput = {
  mode: "terms-only";
  leaseId: number;
  patch: UpdateLeaseInput;
};

/**
 * ReplacePrimaryTenantUpdateInput
 *
 * Safe when changing an existing lease to a different existing primary tenant.
 */
type ReplacePrimaryTenantUpdateInput = {
  mode: "replace-primary";
  leaseId: number;
  patch: Omit<UpdateLeaseInput, "parties">;
  tenantId: number;
};

/**
 * RepairWithExistingTenantUpdateInput
 *
 * Safe for legacy invalid leases that currently have no primary tenant.
 */
type RepairWithExistingTenantUpdateInput = {
  mode: "repair-with-existing-tenant";
  leaseId: number;
  patch: Omit<UpdateLeaseInput, "parties">;
  tenantId: number;
};

/**
 * RepairWithNewTenantUpdateInput
 *
 * Safe for legacy invalid leases when the user creates a tenant during edit.
 */
type RepairWithNewTenantUpdateInput = {
  mode: "repair-with-new-tenant";
  leaseId: number;
  patch: Omit<UpdateLeaseInput, "parties">;
  tenantPayload: CreateTenantInput;
};

/**
 * UpdateLeaseWorkflowInput
 *
 * Unified mutation contract for safe lease update workflows.
 */
export type UpdateLeaseWorkflowInput =
  | TermsOnlyUpdateInput
  | ReplacePrimaryTenantUpdateInput
  | RepairWithExistingTenantUpdateInput
  | RepairWithNewTenantUpdateInput;

/**
 * isValidPositiveInt
 *
 * Checks whether a value is a valid positive integer.
 *
 * @param value Candidate number
 * @returns True when valid
 */
function isValidPositiveInt(value: number | null | undefined): value is number {
  // Step 1: Return true only for positive integers
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * buildPrimaryPartiesPatch
 *
 * Builds the authoritative backend-safe parties payload for a lease patch.
 *
 * @param tenantId Tenant primary key
 * @returns Patch fragment containing a single primary tenant relationship
 */
function buildPrimaryPartiesPatch(
  tenantId: number
): Pick<UpdateLeaseInput, "parties"> {
  // Step 1: Build the authoritative primary tenant mapping
  return {
    parties: [
      {
        tenant_id: tenantId,
        role: "primary",
      },
    ],
  };
}

/**
 * invalidateLeaseUpdateCaches
 *
 * Invalidates lease caches after update.
 *
 * @param queryClient React Query client
 * @param orgSlug Canonical org slug
 * @param unitId Parent unit id
 */
async function invalidateLeaseUpdateCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orgSlug: string,
  unitId: number
): Promise<void> {
  // Step 1: Invalidate the unit-scoped lease cache
  await queryClient.invalidateQueries({
    queryKey: leasesByUnitQueryKey(orgSlug, unitId),
  });

  // Step 2: Future expansion point
  // Add building-scoped and tenant-scoped invalidations here later.
}

/**
 * useUpdateLeaseMutation
 *
 * Shared mutation for the hardened lease update workflow.
 *
 * Supports:
 * - terms-only patch
 * - replacing primary tenant with an existing tenant
 * - repairing a legacy invalid lease with an existing tenant
 * - repairing a legacy invalid lease by creating a new tenant first
 */
export function useUpdateLeaseMutation({
  orgSlug,
  unitId,
}: UseUpdateLeaseMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Normalize org slug
  const safeOrgSlug = orgSlug?.trim() ?? "";

  return useMutation<Lease, unknown, UpdateLeaseWorkflowInput>({
    mutationFn: async (input) => {
      // Step 2: Terms-only workflow
      if (input.mode === "terms-only") {
        return await updateLease(input.leaseId, input.patch);
      }

      // Step 3: Existing-tenant replace / repair workflows
      if (
        input.mode === "replace-primary" ||
        input.mode === "repair-with-existing-tenant"
      ) {
        if (!isValidPositiveInt(input.tenantId)) {
          throw new Error("A valid primary tenant is required to update lease.");
        }

        const finalPatch: UpdateLeaseInput = {
          ...input.patch,
          ...buildPrimaryPartiesPatch(input.tenantId),
        };

        return await updateLease(input.leaseId, finalPatch);
      }

      // Step 4: New-tenant repair workflow
      const createdTenant = await createTenant(safeOrgSlug, input.tenantPayload);

      // Step 5: Guard returned tenant id
      if (!isValidPositiveInt(createdTenant.id)) {
        throw new Error(
          "Tenant creation succeeded but returned an invalid tenant id."
        );
      }

      // Step 6: Build authoritative patch with the newly created tenant
      const finalPatch: UpdateLeaseInput = {
        ...input.patch,
        ...buildPrimaryPartiesPatch(createdTenant.id),
      };

      // Step 7: Patch the lease with the new primary tenant relationship
      return await updateLease(input.leaseId, finalPatch);
    },

    onSuccess: async () => {
      // Step 8: Invalidate lease caches deterministically
      await invalidateLeaseUpdateCaches(queryClient, safeOrgSlug, unitId);
    },
  });
}