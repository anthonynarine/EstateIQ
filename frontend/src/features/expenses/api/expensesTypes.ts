// # Filename: src/features/expenses/api/expensesTypes.ts

// ✅ New Code

/**
 * Expense domain TypeScript contracts.
 *
 * These types define the frontend-facing contract for the Expenses feature.
 * Core CRUD contracts stay fairly strict.
 * Reporting contracts stay intentionally tolerant so sparse aggregate payloads
 * can still render partial UI instead of collapsing the whole section.
 */

/**
 * Represents a generic primary key value returned by the API.
 */
export type EntityId = number;

/**
 * Represents a currency-like numeric value coming from the API.
 *
 * Many Django/DRF backends serialize Decimal values as strings.
 * This union keeps the frontend flexible while preserving type safety.
 */
export type ApiMoney = string | number;

/**
 * Represents a loosely typed scalar that may appear in reporting payloads.
 *
 * Reporting serializers often evolve over time and may return either numbers
 * or strings for aggregate values.
 */
export type ExpenseReportingScalar = string | number | null;

/**
 * Generic paginated response shape commonly returned by DRF.
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Allows the frontend to safely consume either:
 * - a plain array response
 * - or a DRF paginated response
 */
export type CollectionResponse<T> = T[] | PaginatedResponse<T>;

/**
 * Shared lightweight category shape used in list/detail/forms.
 */
export interface ExpenseCategoryOption {
  id: EntityId;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

/**
 * Shared lightweight vendor shape used in list/detail/forms.
 */
export interface ExpenseVendorOption {
  id: EntityId;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

/**
 * Shared lightweight building shape for expense associations.
 *
 * Kept intentionally minimal because the source of truth for building
 * detail belongs to the property/domain slices, not expenses.
 */
export interface ExpenseBuildingOption {
  id: EntityId;
  name: string;
}

/**
 * Shared lightweight unit shape for expense associations.
 */
export interface ExpenseUnitOption {
  id: EntityId;
  unit_number: string;
  building_id?: EntityId | null;
}

/**
 * Shared lightweight lease shape for expense associations.
 */
export interface ExpenseLeaseOption {
  id: EntityId;
  lease_label?: string | null;
}

/**
 * Minimal attachment metadata for expenses.
 *
 * This is included so the slice can expand into attachment UI later
 * without needing a type rewrite.
 */
export interface ExpenseAttachment {
  id: EntityId;
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  uploaded_by?: string | null;
}

/**
 * Base expense fields shared across list/detail records.
 */
export interface ExpenseBase {
  id: EntityId;

  /**
   * Keep both during the contract transition.
   * UI can continue reading description while write flows use title.
   */
  title?: string | null;
  description?: string | null;
  scope?: ExpenseScope;

  amount: ApiMoney;
  expense_date: string;
  notes?: string | null;

  category?: ExpenseCategoryOption | null;
  vendor?: ExpenseVendorOption | null;
  building?: ExpenseBuildingOption | null;
  unit?: ExpenseUnitOption | null;
  lease?: ExpenseLeaseOption | null;

  is_archived?: boolean;
  archived_at?: string | null;

  created_at?: string;
  updated_at?: string;
}

/**
 * Expense list row shape.
 *
 * This is used for tables/cards where we need fast rendering with
 * enough relational context to display the record clearly.
 */
export interface ExpenseListItem extends ExpenseBase {
  attachments_count?: number;
}

/**
 * Expense detail shape.
 *
 * This extends the list item and allows richer detail data when the
 * retrieve endpoint returns more fields than the list endpoint.
 */
export interface ExpenseDetail extends ExpenseListItem {
  attachments?: ExpenseAttachment[];
}

/**
 * Supported frontend filter state for listing expenses.
 *
 * These fields map to likely query params while keeping the frontend
 * implementation modular and easy to expand later.
 */
export interface ExpenseListFilters {
  search?: string;
  category_id?: EntityId | null;
  vendor_id?: EntityId | null;
  building_id?: EntityId | null;
  unit_id?: EntityId | null;
  lease_id?: EntityId | null;
  is_archived?: boolean;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export type ExpenseScope = "organization" | "building" | "unit" | "lease";

/**
 * Payload used when creating an expense record.
 */
export interface CreateExpensePayload {
  scope: ExpenseScope;

  /**
   * Keep title as the canonical write field.
   * Description can still be sent too if the backend supports the fallback.
   */
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

/**
 * Payload used when partially updating an expense record.
 */
export type UpdateExpensePayload = Partial<CreateExpensePayload>;

/**
 * Generic dashboard card metric shape.
 *
 * This gives the UI a stable typed abstraction even if the backend
 * dashboard serializer evolves.
 */
export interface ExpenseDashboardMetric {
  key: string;
  label: string;
  value: ExpenseReportingScalar;
  change?: number | null;
  trend_direction?: "up" | "down" | "flat" | null;
  help_text?: string | null;
}

/**
 * Common summary fields that may appear directly on the dashboard payload
 * or inside a nested summary object.
 *
 * We keep these optional because the current backend may only provide
 * a subset while the reporting UI still needs to render honestly.
 */
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
}

/**
 * Dashboard response for the reporting surface.
 *
 * This shape is deliberately tolerant because real reporting payloads often
 * mix a metrics array with a few top-level scalar summary values.
 */
export interface ExpenseDashboardResponse
  extends ExpenseDashboardSummaryFields {
  metrics?: ExpenseDashboardMetric[];
  summary?: ExpenseDashboardSummaryFields | null;
  totals?: ExpenseDashboardSummaryFields | null;
  [key: string]: unknown;
}

/**
 * Monthly trend data point used for charts/tables.
 *
 * We allow a few alternative label fields because serializers often evolve
 * from "month" to "label" or "period" during chart development.
 */
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

/**
 * Response shape for monthly trend reporting.
 *
 * The UI may receive the collection under points, results, items, or data
 * depending on serializer conventions.
 */
export interface ExpenseMonthlyTrendResponse {
  points?: ExpenseMonthlyTrendPoint[];
  results?: ExpenseMonthlyTrendPoint[];
  items?: ExpenseMonthlyTrendPoint[];
  data?: ExpenseMonthlyTrendPoint[];
  [key: string]: unknown;
}

/**
 * Category breakdown data point used for charts/tables.
 */
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

/**
 * Response shape for category breakdown reporting.
 */
export interface ExpenseByCategoryResponse {
  points?: ExpenseByCategoryPoint[];
  results?: ExpenseByCategoryPoint[];
  items?: ExpenseByCategoryPoint[];
  data?: ExpenseByCategoryPoint[];
  [key: string]: unknown;
}

/**
 * Building breakdown data point used for charts/tables.
 */
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

/**
 * Response shape for building breakdown reporting.
 */
export interface ExpenseByBuildingResponse {
  points?: ExpenseByBuildingPoint[];
  results?: ExpenseByBuildingPoint[];
  items?: ExpenseByBuildingPoint[];
  data?: ExpenseByBuildingPoint[];
  [key: string]: unknown;
}