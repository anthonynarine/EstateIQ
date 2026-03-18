// # Filename: src/features/expenses/api/expensesTypes.ts

// ✅ New Code

/**
 * Expense domain TypeScript contracts.
 *
 * These types define the frontend-facing contract for the Expenses feature.
 * They are intentionally strict around core CRUD fields and intentionally
 * tolerant around reporting payloads until we verify the exact backend
 * serializer shapes in live responses.
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
   description: string;
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
 
 /**
  * Payload for creating a new expense.
  *
  * Foreign key relationships are submitted as IDs from the form layer.
  */
 export interface CreateExpensePayload {
   description: string;
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
  * Payload for updating an expense.
  *
  * Partial updates are expected on the frontend side, even if the backend
  * ultimately routes this through PUT or PATCH.
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
   value: number | string | null;
   change?: number | null;
   trend_direction?: "up" | "down" | "flat" | null;
 }
 
 /**
  * Dashboard response for the reporting surface.
  *
  * Kept extensible because reporting payloads often evolve as the product
  * matures and new cards are added.
  */
 export interface ExpenseDashboardResponse {
   metrics?: ExpenseDashboardMetric[];
   total_expenses?: number;
   expense_count?: number;
   current_month_total?: number;
   year_to_date_total?: number;
   [key: string]: unknown;
 }
 
 /**
  * Monthly trend data point used for charts.
  */
 export interface ExpenseMonthlyTrendPoint {
   month: string;
   total: number;
   [key: string]: unknown;
 }
 
 /**
  * Response shape for monthly trend reporting.
  */
 export interface ExpenseMonthlyTrendResponse {
   points?: ExpenseMonthlyTrendPoint[];
   results?: ExpenseMonthlyTrendPoint[];
   [key: string]: unknown;
 }
 
 /**
  * Category breakdown data point used for charts/tables.
  */
 export interface ExpenseByCategoryPoint {
   category_id?: EntityId | null;
   category_name?: string;
   total: number;
   count?: number;
   [key: string]: unknown;
 }
 
 /**
  * Response shape for category breakdown reporting.
  */
 export interface ExpenseByCategoryResponse {
   points?: ExpenseByCategoryPoint[];
   results?: ExpenseByCategoryPoint[];
   [key: string]: unknown;
 }
 
 /**
  * Building breakdown data point used for charts/tables.
  */
 export interface ExpenseByBuildingPoint {
   building_id?: EntityId | null;
   building_name?: string;
   total: number;
   count?: number;
   [key: string]: unknown;
 }
 
 /**
  * Response shape for building breakdown reporting.
  */
 export interface ExpenseByBuildingResponse {
   points?: ExpenseByBuildingPoint[];
   results?: ExpenseByBuildingPoint[];
   [key: string]: unknown;
 }