

/**
 * Expense domain TypeScript contracts.
 *
 * These types define the frontend-facing contract for the Expenses feature.
 * They are aligned to the current DRF serializer surface while remaining
 * tolerant enough for the reporting layer to evolve safely.
 */

export type EntityId = number;
export type ApiMoney = string | number;
export type ExpenseReportingScalar = string | number | null;
export type ExpenseScope = "organization" | "building" | "unit" | "lease";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type CollectionResponse<T> = T[] | PaginatedResponse<T>;

export interface ExpenseCategoryOption {
  id: EntityId;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface ExpenseVendorOption {
  id: EntityId;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export interface ExpenseBuildingOption {
  id: EntityId;
  name: string;
}

export interface ExpenseUnitOption {
  id: EntityId;
  name?: string | null;
  unit_number?: string | null;
  building_id?: EntityId | null;
}

export interface ExpenseLeaseOption {
  id: EntityId;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  lease_label?: string | null;
}

export interface ExpenseAttachment {
  id: EntityId;
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  uploaded_by?: string | null;
}

export interface ExpenseReimbursementSummary {
  is_reimbursable: boolean;
  status?: string | null;
  status_label?: string | null;
}

export interface ExpenseBase {
  id: EntityId;
  organization?: EntityId;

  scope?: ExpenseScope;
  scope_label?: string;

  /**
   * Backend currently returns raw relation ids here.
   */
  building?: EntityId | null;
  unit?: EntityId | null;
  lease?: EntityId | null;

  /**
   * Frontend-friendly summaries returned by the read serializers.
   */
  building_summary?: ExpenseBuildingOption | null;
  unit_summary?: ExpenseUnitOption | null;
  lease_summary?: ExpenseLeaseOption | null;

  category?: ExpenseCategoryOption | null;
  vendor?: ExpenseVendorOption | null;

  title?: string | null;
  description?: string | null;
  location_summary?: string | null;

  amount: ApiMoney;
  expense_date: string;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;

  status?: string | null;
  status_label?: string | null;
  is_paid?: boolean;
  is_overdue?: boolean;

  is_reimbursable?: boolean;
  reimbursement_status?: string | null;
  reimbursement_status_label?: string | null;
  reimbursement?: ExpenseReimbursementSummary | null;

  attachment_count?: number;
  has_attachments?: boolean;
  can_archive?: boolean;

  is_archived?: boolean;
  archived_at?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface ExpenseListItem extends ExpenseBase {}

export interface ExpenseDetail extends ExpenseBase {
  invoice_number?: string | null;
  external_reference?: string | null;
  source?: string | null;
  attachments?: ExpenseAttachment[];
  created_by?: EntityId | null;
  updated_by?: EntityId | null;
}

/**
 * Frontend-owned filter state.
 *
 * Keep `*_id` keys on the client for clarity, then map them to the backend's
 * query param names in the API layer.
 */
export interface ExpenseListFilters {
  search?: string;
  scope?: ExpenseScope | null;

  category_id?: EntityId | null;
  vendor_id?: EntityId | null;
  building_id?: EntityId | null;
  unit_id?: EntityId | null;
  lease_id?: EntityId | null;

  status?: string | null;
  reimbursement_status?: string | null;

  is_reimbursable?: boolean | null;
  is_archived?: boolean | null;

  expense_date_from?: string;
  expense_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;

  /**
   * Backward-compatible aliases in case any page state still uses the old names.
   */
  date_from?: string;
  date_to?: string;

  ordering?: string;
  page?: number;
  page_size?: number;
  top_n?: number;
}

export interface CreateExpensePayload {
  scope: ExpenseScope;
  title: string;
  description?: string;
  amount: ApiMoney;
  expense_date: string;
  notes?: string;
  category_id?: EntityId | null;
  vendor_id?: EntityId | null;
  building_id?: EntityId | null;
  unit_id?: EntityId | null;
  lease_id?: EntityId | null;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface ExpenseDashboardMetric {
  key: string;
  label: string;
  value: ExpenseReportingScalar;
  change?: number | null;
  trend_direction?: "up" | "down" | "flat" | null;
  help_text?: string | null;
}

export interface ExpenseDashboardSummaryFields {
  total_expense_amount?: ExpenseReportingScalar;
  total_expenses?: ExpenseReportingScalar;
  expense_count?: number | null;
  active_expense_count?: number | null;
  archived_expense_count?: number | null;
  excluded_expense_count?: number | null;
  current_month_total?: ExpenseReportingScalar;
  year_to_date_total?: ExpenseReportingScalar;
  average_expense_amount?: ExpenseReportingScalar;
  latest_expense_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface ExpenseMonthlyTrendPoint {
  month?: string;
  label?: string;
  period?: string;
  total?: ExpenseReportingScalar;
  amount?: ExpenseReportingScalar;
  value?: ExpenseReportingScalar;
  count?: number;
  [key: string]: unknown;
}

export interface ExpenseMonthlyTrendResponse {
  points?: ExpenseMonthlyTrendPoint[];
  results?: ExpenseMonthlyTrendPoint[];
  items?: ExpenseMonthlyTrendPoint[];
  data?: ExpenseMonthlyTrendPoint[];
  [key: string]: unknown;
}

export interface ExpenseByCategoryPoint {
  category_id?: EntityId | null;
  category_name?: string | null;
  label?: string | null;
  name?: string | null;
  total?: ExpenseReportingScalar;
  amount?: ExpenseReportingScalar;
  value?: ExpenseReportingScalar;
  count?: number;
  [key: string]: unknown;
}

export interface ExpenseByCategoryResponse {
  points?: ExpenseByCategoryPoint[];
  results?: ExpenseByCategoryPoint[];
  items?: ExpenseByCategoryPoint[];
  data?: ExpenseByCategoryPoint[];
  [key: string]: unknown;
}

export interface ExpenseByBuildingPoint {
  building_id?: EntityId | null;
  building_name?: string | null;
  label?: string | null;
  name?: string | null;
  total?: ExpenseReportingScalar;
  amount?: ExpenseReportingScalar;
  value?: ExpenseReportingScalar;
  count?: number;
  [key: string]: unknown;
}

export interface ExpenseByBuildingResponse {
  points?: ExpenseByBuildingPoint[];
  results?: ExpenseByBuildingPoint[];
  items?: ExpenseByBuildingPoint[];
  data?: ExpenseByBuildingPoint[];
  [key: string]: unknown;
}

export interface ExpenseByUnitPoint {
  unit_id?: EntityId | null;
  unit_name?: string | null;
  label?: string | null;
  name?: string | null;
  total?: ExpenseReportingScalar;
  amount?: ExpenseReportingScalar;
  value?: ExpenseReportingScalar;
  count?: number;
  [key: string]: unknown;
}

export interface ExpenseByUnitResponse {
  points?: ExpenseByUnitPoint[];
  results?: ExpenseByUnitPoint[];
  items?: ExpenseByUnitPoint[];
  data?: ExpenseByUnitPoint[];
  [key: string]: unknown;
}

export interface ExpenseDashboardCharts {
  monthly_expense_trend?: ExpenseMonthlyTrendPoint[];
  expense_by_category?: ExpenseByCategoryPoint[];
  expense_by_building?: ExpenseByBuildingPoint[];
  expense_by_unit?: ExpenseByUnitPoint[];
}

export interface ExpenseDashboardResponse
  extends ExpenseDashboardSummaryFields {
  metrics?: ExpenseDashboardMetric[];
  summary?: ExpenseDashboardSummaryFields | null;
  totals?: ExpenseDashboardSummaryFields | null;
  charts?: ExpenseDashboardCharts | null;
  [key: string]: unknown;
}

export interface ExpenseVendorRecord extends ExpenseVendorOption {
  vendor_type?: string | null;
  vendor_type_label?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVendorPayload {
  name: string;
  vendor_type?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_active?: boolean;
}