
// # Filename: src/api/paymentsApi.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./axios";
import { reportsQueryKeys } from "./reportsApi";
import { leaseQueryKeys } from "./leaseApi";

export type PaymentAllocationMode = "auto" | "manual";

export type PaymentCreatePayload = {
  lease: number;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  memo?: string;
  allocation_mode?: PaymentAllocationMode; // default: "auto"
};

export type PaymentCreateResponse = {
  id: number;
  lease: number;
  amount: number;
  payment_date: string;
  allocation_mode: PaymentAllocationMode;
};

async function createPayment(payload: PaymentCreatePayload): Promise<PaymentCreateResponse> {
  // Step 1: minimal validation to prevent junk requests
  if (!payload.lease || payload.lease <= 0) {
    throw new Error("createPayment: lease is required");
  }
  if (!payload.amount || payload.amount <= 0) {
    throw new Error("createPayment: amount must be > 0");
  }
  if (!payload.payment_date) {
    throw new Error("createPayment: payment_date is required");
  }

  const res = await api.post<PaymentCreateResponse>("/api/v1/payments/", {
    ...payload,
    allocation_mode: payload.allocation_mode ?? "auto",
  });

  return res.data;
}

export function useCreatePaymentMutation(params: {
  orgSlug: string | null | undefined;
  leaseId: number;
}) {
  const { orgSlug, leaseId } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
      if (!orgSlug) return;

      // Step 1: invalidate lease ledger (deterministic)
      await queryClient.invalidateQueries({
        queryKey: leaseQueryKeys.leaseLedger(orgSlug, leaseId),
      });

      // Step 2: invalidate portfolio brain endpoints
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reportsQueryKeys.dashboardSummary(orgSlug) }),
        queryClient.invalidateQueries({ queryKey: reportsQueryKeys.delinquency(orgSlug) }),
      ]);
    },
  });
}