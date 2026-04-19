// # Filename: src/features/billing/api/types/reporting.ts



import type { BillingId, ISODateString, MoneyValue } from "./primitives";

/**
 * DelinquencyLeaseSummary
 *
 * Lightweight lease display information for delinquency reporting rows.
 */
export interface DelinquencyLeaseSummary {
  lease_id: BillingId;
  lease_status?: string;
  tenant_display?: string | null;
  building_name?: string | null;
  unit_label?: string | null;
}

/**
 * DelinquencyRow
 *
 * Single row in the delinquency report.
 *
 * Responsibilities:
 * - represent org-level outstanding balance by lease
 * - keep aging-bucket fields explicit for table rendering
 */
export interface DelinquencyRow {
  lease_id: BillingId;
  tenant_display?: string | null;
  building_name?: string | null;
  unit_label?: string | null;
  total_outstanding: MoneyValue;
  current_amount?: MoneyValue;
  amount_1_30?: MoneyValue;
  amount_31_60?: MoneyValue;
  amount_61_90?: MoneyValue;
  amount_90_plus?: MoneyValue;
  oldest_due_date?: ISODateString | null;
  overdue_charge_count?: number;
}

/**
 * DelinquencyReportResponse
 *
 * Org-level delinquency reporting payload.
 */
export interface DelinquencyReportResponse {
  as_of: ISODateString;
  rows: DelinquencyRow[];
}

/**
 * BillingDashboardSummary
 *
 * Dashboard card payload for the billing overview surface.
 *
 * Important:
 * `cash_applied_to_current_month_rent` is allocation-driven, not merely
 * "payments received this month."
 */
export interface BillingDashboardSummary {
  as_of: ISODateString;
  expected_rent_this_month: MoneyValue;
  cash_applied_to_current_month_rent: MoneyValue;
  outstanding_as_of: MoneyValue;
  delinquent_leases_count: number;
  unapplied_credits_total: MoneyValue;
}

/**
 * DelinquencyQueryParams
 *
 * Query params accepted by org-level delinquency reporting requests.
 */
export interface DelinquencyQueryParams {
  asOf: ISODateString;
}

/**
 * BillingDashboardSummaryQueryParams
 *
 * Optional future query params for dashboard summary requests.
 */
export interface BillingDashboardSummaryQueryParams {
  asOf?: ISODateString;
}