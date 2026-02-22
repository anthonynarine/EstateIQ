
// # Filename: src/api/reportsApi.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import  api  from "./axios";

// -----------------------------
// # Step 1: Types (keep strict + backend-aligned)
// -----------------------------

export type DashboardSummaryResponse = {
  expected: number;
  collected: number;
  outstanding: number;
  delinquent_leases: number;
  unapplied_credits: number;
};

export type DelinquencyResponse = {
  as_of: string;
  total_outstanding: number;
  leases: Array<{
    lease_id: number;
    unit_label?: string;
    tenant_name?: string;
    total_due: number;
    buckets?: Record<string, number>;
  }>;
};

export type RunRentPostingResponse = {
  month: string;
  created_charges: number;
  skipped_existing: number;
};

// -----------------------------
// # Step 2: Org-safe query keys (orgSlug = hard boundary)
// -----------------------------

export const reportsQueryKeys = {
  dashboardSummary: (orgSlug: string) => ["org", orgSlug, "reports", "dashboard-summary"] as const,
  delinquency: (orgSlug: string) => ["org", orgSlug, "reports", "delinquency"] as const,
  runRentPosting: (orgSlug: string) =>
    ["org", orgSlug, "reports", "rent-posting", "run-current-month"] as const,
};

// -----------------------------
// # Step 3: API calls (URL is source of truth)
// -----------------------------

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  // Step 1: GET dashboard summary
  const res = await api.get<DashboardSummaryResponse>("/api/v1/reports/dashboard-summary/");
  return res.data;
}

async function fetchDelinquency(): Promise<DelinquencyResponse> {
  // Step 1: GET delinquency report
  const res = await api.get<DelinquencyResponse>("/api/v1/reports/delinquency/");
  return res.data;
}

async function runRentPostingCurrentMonth(): Promise<RunRentPostingResponse> {
  // Step 1: POST rent posting job
  const res = await api.post<RunRentPostingResponse>("/api/v1/reports/rent-posting/run-current-month/");
  return res.data;
}

// -----------------------------
// # Step 4: Query hooks (enabled requires orgSlug)
// -----------------------------

export function useDashboardSummaryQuery(orgSlug: string | null | undefined) {
  return useQuery({
    queryKey: orgSlug ? reportsQueryKeys.dashboardSummary(orgSlug) : ["org", "missing", "reports"],
    queryFn: fetchDashboardSummary,
    enabled: Boolean(orgSlug),
    staleTime: 15_000,
  });
}

export function useDelinquencyQuery(orgSlug: string | null | undefined) {
  return useQuery({
    queryKey: orgSlug ? reportsQueryKeys.delinquency(orgSlug) : ["org", "missing", "reports"],
    queryFn: fetchDelinquency,
    enabled: Boolean(orgSlug),
    staleTime: 15_000,
  });
}

// -----------------------------
// # Step 5: Mutation hook + invalidation seam
// -----------------------------

export function useRunRentPostingMutation(orgSlug: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: orgSlug ? reportsQueryKeys.runRentPosting(orgSlug) : undefined,
    mutationFn: runRentPostingCurrentMonth,

    onSuccess: async () => {
      if (!orgSlug) return;

      // Step 1: invalidate the portfolio “brain” endpoints
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reportsQueryKeys.dashboardSummary(orgSlug) }),
        queryClient.invalidateQueries({ queryKey: reportsQueryKeys.delinquency(orgSlug) }),
      ]);

      // Step 2: lease-ledger invalidation will be added in Module 3
      // because lease ledger query keys live in leaseApi.ts / lease feature.
    },
  });
}