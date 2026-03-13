// # Filename: src/features/leases/queries/useCreateLeaseMutation.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLease } from "../api/leaseApi";
import type { CreateLeaseInput, Lease } from "../api/types";
import { leasesByUnitQueryKey } from "./useLeasesByUnitQuery";
import { createTenant } from "../../tenants/api/tenantsApi";
import type { CreateTenantInput } from "../../tenants/api/types";

/**
 * UseCreateLeaseMutationArgs
 *
 * Shared create mutation args.
 */
type UseCreateLeaseMutationArgs = {
  orgSlug: string;
};

/**
 * UseCreateLeaseForUnitMutationArgs
 *
 * Unit-scoped helper args for the existing unit-first workflow.
 */
type UseCreateLeaseForUnitMutationArgs = {
  orgSlug: string;
  unitId: number;
};

/**
 * CreateLeaseForUnitInput
 *
 * Payload for the compatibility unit-first helper.
 * The helper injects `unit` internally.
 */
type CreateLeaseForUnitInput = Omit<CreateLeaseInput, "unit">;

/**
 * CreateLeaseWithExistingTenantInput
 *
 * Existing-tenant workflow:
 * - form/hook already resolved a valid primary tenant
 * - payload already contains `parties`
 */
type CreateLeaseWithExistingTenantInput = {
  mode: "existing-tenant";
  leasePayload: CreateLeaseInput;
};

/**
 * CreateLeaseWithNewTenantInput
 *
 * New-tenant workflow:
 * - tenant must be created first
 * - mutation will inject returned tenant id into lease `parties`
 */
type CreateLeaseWithNewTenantInput = {
  mode: "new-tenant";
  leasePayload: Omit<CreateLeaseInput, "parties">;
  tenantPayload: CreateTenantInput;
};

/**
 * CreateLeaseWorkflowInput
 *
 * Unified mutation contract for create lease workflows.
 */
export type CreateLeaseWorkflowInput =
  | CreateLeaseWithExistingTenantInput
  | CreateLeaseWithNewTenantInput;

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
 * invalidateLeaseCreateCaches
 *
 * Invalidates the primary lease caches after create.
 *
 * @param queryClient React Query client
 * @param orgSlug Canonical org slug
 * @param unitId Unit id tied to the created lease
 */
async function invalidateLeaseCreateCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orgSlug: string,
  unitId: number
): Promise<void> {
  // Step 1: Invalidate the unit lease history/cache
  await queryClient.invalidateQueries({
    queryKey: leasesByUnitQueryKey(orgSlug, unitId),
  });

  // Step 2: Future expansion point
  // Add building-scoped and tenant-scoped invalidations here later.
}

/**
 * useCreateLeaseMutation
 *
 * Shared mutation for the unified lease create workflow.
 *
 * Supports:
 * - existing tenant -> create lease directly
 * - new tenant -> create tenant first, then create lease
 */
export function useCreateLeaseMutation({
  orgSlug,
}: UseCreateLeaseMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Normalize org slug
  const safeOrgSlug = orgSlug?.trim() ?? "";

  return useMutation<Lease, unknown, CreateLeaseWorkflowInput>({
    mutationFn: async (input) => {
      // Step 2: Existing-tenant workflow
      if (input.mode === "existing-tenant") {
        return await createLease(input.leasePayload);
      }

      // Step 3: Create tenant first for new-tenant workflow
      const createdTenant = await createTenant(safeOrgSlug, input.tenantPayload);

      // Step 4: Guard returned tenant id
      if (!isValidPositiveInt(createdTenant.id)) {
        throw new Error(
          "Tenant creation succeeded but returned an invalid tenant id."
        );
      }

      // Step 5: Build backend-safe lease payload with required primary tenant link
      const finalLeasePayload: CreateLeaseInput = {
        ...input.leasePayload,
        parties: [
          {
            tenant_id: createdTenant.id,
            role: "primary",
          },
        ],
      };

      // Step 6: Create lease using the newly created tenant
      return await createLease(finalLeasePayload);
    },

    onSuccess: async (createdLease) => {
      // Step 7: Invalidate lease caches from authoritative server response
      await invalidateLeaseCreateCaches(
        queryClient,
        safeOrgSlug,
        createdLease.unit
      );
    },
  });
}

/**
 * useCreateLeaseForUnitMutation
 *
 * Compatibility helper for the existing Building Detail / Unit workflow.
 *
 * Use this only when the unit is already known and should be enforced
 * internally by the hook.
 */
export function useCreateLeaseForUnitMutation({
  orgSlug,
  unitId,
}: UseCreateLeaseForUnitMutationArgs) {
  const queryClient = useQueryClient();

  // Step 1: Normalize inputs
  const safeOrgSlug = orgSlug?.trim() ?? "";
  const safeUnitId = Number(unitId);

  return useMutation<Lease, unknown, CreateLeaseForUnitInput>({
    mutationFn: async (input) => {
      // Step 2: Guard invalid unit ids early
      if (!isValidPositiveInt(safeUnitId)) {
        throw new Error(
          "Invalid unit id passed to useCreateLeaseForUnitMutation."
        );
      }

      // Step 3: Enforce the unit internally for unit-first workflows
      const payload: CreateLeaseInput = {
        ...input,
        unit: safeUnitId,
      };

      // Step 4: Submit request
      return await createLease(payload);
    },

    onSuccess: async (createdLease) => {
      // Step 5: Invalidate caches from authoritative response
      await invalidateLeaseCreateCaches(
        queryClient,
        safeOrgSlug,
        createdLease.unit
      );
    },
  });
}