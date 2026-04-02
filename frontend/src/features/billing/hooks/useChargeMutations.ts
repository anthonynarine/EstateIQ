// # Filename: src/features/billing/hooks/useChargeMutations.ts


import { useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import api from "../../../api/axios";

import billingQueryKeys from "../api/billingQueryKeys";
import createChargesApi, {
  type ChargeRequestFieldMode,
} from "../api/chargesApi";
import type {
  BillingApiErrorShape,
  BillingId,
  GenerateRentChargeFormValues,
  GenerateRentChargeResponse,
} from "../api/billingTypes";

/**
 * GenerateRentChargeMutationVariables
 *
 * Mutation variables required to generate a rent charge for a lease.
 */
export interface GenerateRentChargeMutationVariables {
  payload: GenerateRentChargeFormValues;
  orgSlug?: string | null;
  requestFieldMode?: ChargeRequestFieldMode;
}

/**
 * UseChargeMutationsOptions
 *
 * Optional configuration for the charge mutation hook.
 */
export interface UseChargeMutationsOptions {
  orgSlug?: string | null;
  leaseId?: BillingId | null;
  requestFieldMode?: ChargeRequestFieldMode;
}

/**
 * UseChargeMutationsResult
 *
 * Public contract returned by the charge mutation hook.
 */
export interface UseChargeMutationsResult {
  generateRentChargeMutation: UseMutationResult<
    GenerateRentChargeResponse,
    BillingApiErrorShape | Error,
    GenerateRentChargeMutationVariables
  >;
}

/**
 * normalizeOrgSlug
 *
 * Produces a stable optional organization slug for query invalidation
 * and transport scoping.
 *
 * @param orgSlug - Caller-provided organization slug.
 * @returns A trimmed organization slug or undefined.
 */
function normalizeOrgSlug(orgSlug?: string | null): string | undefined {
  const trimmedOrgSlug = orgSlug?.trim();

  if (!trimmedOrgSlug) {
    return undefined;
  }

  return trimmedOrgSlug;
}

/**
 * normalizeLeaseId
 *
 * Produces a stable optional lease id for query invalidation.
 *
 * @param leaseId - Caller-provided lease id.
 * @returns A normalized lease id or null when absent.
 */
function normalizeLeaseId(leaseId?: BillingId | null): BillingId | null {
  if (leaseId === null || leaseId === undefined) {
    return null;
  }

  const trimmedLeaseId = String(leaseId).trim();

  if (!trimmedLeaseId) {
    return null;
  }

  return leaseId;
}

/**
 * resolveMutationOrgSlug
 *
 * Resolves the most specific org slug for a given mutation run.
 * Mutation-level input wins over hook-level defaults.
 *
 * @param hookOrgSlug - Default org slug supplied to the hook.
 * @param mutationOrgSlug - Optional org slug supplied during mutate().
 * @returns The resolved org slug or undefined.
 */
function resolveMutationOrgSlug(
  hookOrgSlug?: string | null,
  mutationOrgSlug?: string | null,
): string | undefined {
  return normalizeOrgSlug(mutationOrgSlug) ?? normalizeOrgSlug(hookOrgSlug);
}

/**
 * resolveMutationLeaseId
 *
 * Resolves the most specific lease id for cache invalidation.
 * Mutation payload lease id wins over hook-level defaults because the
 * payload is the actual write target.
 *
 * @param hookLeaseId - Default lease id supplied to the hook.
 * @param payloadLeaseId - Lease id from the mutation payload.
 * @returns The resolved lease id or null.
 */
function resolveMutationLeaseId(
  hookLeaseId?: BillingId | null,
  payloadLeaseId?: BillingId | null,
): BillingId | null {
  return normalizeLeaseId(payloadLeaseId) ?? normalizeLeaseId(hookLeaseId);
}

/**
 * resolveRequestFieldMode
 *
 * Resolves the backend request field mode for charge generation.
 * Mutation-level input wins over hook-level defaults.
 *
 * @param hookRequestFieldMode - Default request field mode from the hook.
 * @param mutationRequestFieldMode - Optional request field mode from mutate().
 * @returns The resolved backend request field mode.
 */
function resolveRequestFieldMode(
  hookRequestFieldMode?: ChargeRequestFieldMode,
  mutationRequestFieldMode?: ChargeRequestFieldMode,
): ChargeRequestFieldMode {
  return mutationRequestFieldMode ?? hookRequestFieldMode ?? "charge_month";
}

/**
 * useChargeMutations
 *
 * Centralized TanStack Query mutation hook for billing charge writes.
 *
 * Responsibilities:
 * - submit explicit monthly rent charge generation through the charges API
 * - keep transport logic out of page and panel components
 * - invalidate lease-scoped and org-scoped billing queries after success
 *
 * Important architectural boundary:
 * - The backend remains the source of truth for lease eligibility,
 *   idempotency, due date derivation, audit logging, and ledger math.
 * - This hook only orchestrates the write and subsequent cache refresh.
 *
 * @param options - Optional org, lease, and request-field defaults.
 * @returns Charge mutation handles for the billing feature.
 */
export function useChargeMutations(
  options: UseChargeMutationsOptions = {},
): UseChargeMutationsResult {
  const queryClient = useQueryClient();

  const chargesApi = useMemo(() => {
    return createChargesApi(api);
  }, []);

  const normalizedHookOrgSlug = useMemo(() => {
    return normalizeOrgSlug(options.orgSlug);
  }, [options.orgSlug]);

  const normalizedHookLeaseId = useMemo(() => {
    return normalizeLeaseId(options.leaseId);
  }, [options.leaseId]);

  const generateRentChargeMutation = useMutation<
    GenerateRentChargeResponse,
    BillingApiErrorShape | Error,
    GenerateRentChargeMutationVariables
  >({
    mutationFn: async ({
      payload,
      orgSlug,
      requestFieldMode,
    }: GenerateRentChargeMutationVariables): Promise<GenerateRentChargeResponse> => {
      const resolvedOrgSlug = resolveMutationOrgSlug(
        normalizedHookOrgSlug,
        orgSlug,
      );
      const resolvedRequestFieldMode = resolveRequestFieldMode(
        options.requestFieldMode,
        requestFieldMode,
      );

      return await chargesApi.generateRentCharge({
        payload,
        orgSlug: resolvedOrgSlug,
        requestFieldMode: resolvedRequestFieldMode,
      });
    },

    onSuccess: async (
      _data: GenerateRentChargeResponse,
      variables: GenerateRentChargeMutationVariables,
    ) => {
      const resolvedOrgSlug = resolveMutationOrgSlug(
        normalizedHookOrgSlug,
        variables.orgSlug,
      );

      const resolvedLeaseId = resolveMutationLeaseId(
        normalizedHookLeaseId,
        variables.payload.leaseId,
      );

      const invalidationPromises: Array<Promise<unknown>> = [];

      if (resolvedOrgSlug && resolvedLeaseId !== null) {
        invalidationPromises.push(
          queryClient.invalidateQueries({
            queryKey: billingQueryKeys.leaseLedger(
              resolvedOrgSlug,
              resolvedLeaseId,
            ),
          }),
        );
      }

      if (resolvedOrgSlug) {
        invalidationPromises.push(
          queryClient.invalidateQueries({
            queryKey: billingQueryKeys.dashboard(resolvedOrgSlug),
          }),
        );

        invalidationPromises.push(
          queryClient.invalidateQueries({
            queryKey: billingQueryKeys.reports(resolvedOrgSlug),
          }),
        );
      }

      await Promise.all(invalidationPromises);
    },
  });

  return {
    generateRentChargeMutation,
  };
}

export default useChargeMutations;