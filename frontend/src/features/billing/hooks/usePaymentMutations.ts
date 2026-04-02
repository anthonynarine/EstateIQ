// # Filename: src/features/billing/hooks/usePaymentMutations.ts


import { useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import api from "../../../api/axios";

import billingQueryKeys from "../api/billingQueryKeys";
import createPaymentsApi from "../api/paymentsApi";
import type {
  BillingApiErrorShape,
  BillingId,
  CreatePaymentResponse,
  RecordPaymentFormValues,
} from "../api/billingTypes";

/**
 * CreatePaymentMutationVariables
 *
 * Mutation variables required to record a payment for a lease.
 */
export interface CreatePaymentMutationVariables {
  payload: RecordPaymentFormValues;
  orgSlug?: string | null;
}

/**
 * UsePaymentMutationsOptions
 *
 * Optional configuration for the payment mutation hook.
 */
export interface UsePaymentMutationsOptions {
  orgSlug?: string | null;
  leaseId?: BillingId | null;
}

/**
 * UsePaymentMutationsResult
 *
 * Public contract returned by the payment mutation hook.
 */
export interface UsePaymentMutationsResult {
  createPaymentMutation: UseMutationResult<
    CreatePaymentResponse,
    BillingApiErrorShape | Error,
    CreatePaymentMutationVariables
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
 * payment payload is the actual write target.
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
 * usePaymentMutations
 *
 * Centralized TanStack Query mutation hook for billing payment writes.
 *
 * Responsibilities:
 * - submit payment creation through the payments API module
 * - keep transport logic out of page and modal components
 * - invalidate lease-scoped and org-scoped billing queries after success
 *
 * Important architectural boundary:
 * - The backend remains the source of truth for ledger math, allocations,
 *   unapplied balances, and delinquency state.
 * - This hook only orchestrates the write and subsequent cache refresh.
 *
 * @param options - Optional org and lease defaults for the mutation lifecycle.
 * @returns Payment mutation handles for the billing feature.
 */
export function usePaymentMutations(
  options: UsePaymentMutationsOptions = {},
): UsePaymentMutationsResult {
  const queryClient = useQueryClient();

  const paymentsApi = useMemo(() => {
    return createPaymentsApi(api);
  }, []);

  const normalizedHookOrgSlug = useMemo(() => {
    return normalizeOrgSlug(options.orgSlug);
  }, [options.orgSlug]);

  const normalizedHookLeaseId = useMemo(() => {
    return normalizeLeaseId(options.leaseId);
  }, [options.leaseId]);

  const createPaymentMutation = useMutation<
    CreatePaymentResponse,
    BillingApiErrorShape | Error,
    CreatePaymentMutationVariables
  >({
    mutationFn: async ({
      payload,
      orgSlug,
    }: CreatePaymentMutationVariables): Promise<CreatePaymentResponse> => {
      const resolvedOrgSlug = resolveMutationOrgSlug(
        normalizedHookOrgSlug,
        orgSlug,
      );

      return paymentsApi.createPayment({
        payload,
        orgSlug: resolvedOrgSlug,
      });
    },

    onSuccess: async (
      _data: CreatePaymentResponse,
      variables: CreatePaymentMutationVariables,
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
    createPaymentMutation,
  };
}

export default usePaymentMutations;