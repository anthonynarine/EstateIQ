// # Filename: src/features/billing/api/billingTypes.ts

/**
 * BillingId
 *
 * Shared identifier shape for billing-domain entities.
 *
 * We intentionally allow both `string` and `number` because the frontend
 * should not overfit to one ID style too early. Some environments may use
 * integer primary keys while others may expose UUID strings.
 */
 export type BillingId = string | number;

 /**
  * MoneyValue
  *
  * Decimal-like monetary values coming from the API.
  *
  * Django/DRF frequently serializes decimals as strings. Some endpoints or
  * local mock data may still produce numbers. The UI layer should normalize
  * values before doing math or formatting.
  */
 export type MoneyValue = string | number;
 
 /**
  * ISODateString
  *
  * Canonical string shape used for date-only fields such as:
  * - due dates
  * - charge months
  * - report as-of dates
  *
  * Example: `2026-04-01`
  */
 export type ISODateString = string;
 
 /**
  * ISODateTimeString
  *
  * Canonical string shape used for timestamp or datetime-like fields.
  *
  * Example: `2026-04-01T14:35:00Z`
  */
 export type ISODateTimeString = string;
 
 /**
  * ExtensibleString
  *
  * Helper type that preserves autocomplete for known literals while still
  * allowing new backend enum values without forcing an immediate frontend
  * type break.
  */
 export type ExtensibleString<T extends string> = T | (string & {});
 
 /**
  * ChargeKind
  *
  * Stable charge kinds currently expected by the billing backend.
  * The type remains extensible for future additions such as utility
  * pass-throughs, fees, adjustments, or concessions.
  */
 export type ChargeKind = ExtensibleString<"rent" | "late_fee" | "misc">;
 
 /**
  * ChargeStatus
  *
  * Current workflow status for a charge record.
  */
 export type ChargeStatus = ExtensibleString<"posted" | "void">;
 
 /**
  * PaymentMethod
  *
  * Supported payment methods for MVP billing entry.
  */
 export type PaymentMethod = ExtensibleString<
   "cash" | "zelle" | "ach" | "check" | "venmo" | "other"
 >;
 
 /**
  * AllocationMode
  *
  * Strategy used when creating a payment.
  *
  * Common expectations:
  * - `auto`: backend allocates deterministically
  * - `manual`: caller sends explicit allocations
  * - `none`: payment remains unapplied
  *
  * The exact backend literals may still evolve, so this stays extensible.
  */
 export type AllocationMode = ExtensibleString<"auto" | "manual" | "none">;
 
 /**
  * AgingBucketKey
  *
  * Standard delinquency aging buckets for billing reporting.
  */
 export type AgingBucketKey = ExtensibleString<
   "current" | "1_30" | "31_60" | "61_90" | "90_plus"
 >;
 
 /**
  * BillingEntitySummary
  *
  * Shared light-weight display object used for related entities in billing
  * responses when a nested read model is preferable to repeating top-level
  * primitives everywhere.
  */
 export interface BillingEntitySummary {
   id: BillingId;
   label: string;
 }
 
 /**
  * LeaseLedgerTotals
  *
  * Aggregate monetary totals returned with the lease ledger payload.
  *
  * These fields are intentionally tolerant because the backend may expose
  * additional totals over time. The page should render backend-derived truth
  * rather than recomputing ledger state from scratch in the browser.
  */
 export interface LeaseLedgerTotals {
   total_charges?: MoneyValue;
   total_payments?: MoneyValue;
   total_allocated?: MoneyValue;
   outstanding_balance?: MoneyValue;
   unapplied_amount?: MoneyValue;
   overdue_amount?: MoneyValue;
   [key: string]: MoneyValue | undefined;
 }
 
 /**
  * LeaseLedgerCharge
  *
  * Read model for a charge row inside the lease ledger payload.
  */
 export interface LeaseLedgerCharge {
   id: BillingId;
   lease_id?: BillingId;
   kind: ChargeKind;
   status?: ChargeStatus;
   amount: MoneyValue;
   due_date: ISODateString;
   charge_month?: ISODateString | null;
   notes?: string | null;
   allocated_total?: MoneyValue;
   remaining_balance?: MoneyValue;
   is_overdue?: boolean;
   created_at?: ISODateTimeString;
   updated_at?: ISODateTimeString;
 }
 
 /**
  * LeaseLedgerPayment
  *
  * Read model for a payment row inside the lease ledger payload.
  */
 export interface LeaseLedgerPayment {
   id: BillingId;
   lease_id?: BillingId;
   amount: MoneyValue;
   paid_at: ISODateString | ISODateTimeString;
   method: PaymentMethod;
   external_ref?: string | null;
   notes?: string | null;
   allocation_mode?: AllocationMode;
   allocated_total?: MoneyValue;
   unapplied_amount?: MoneyValue;
   created_at?: ISODateTimeString;
   updated_at?: ISODateTimeString;
 }
 
 /**
  * LeaseLedgerAllocation
  *
  * Read model that describes how payment value was applied to charges.
  */
 export interface LeaseLedgerAllocation {
   id: BillingId;
   payment_id: BillingId;
   charge_id: BillingId;
   amount: MoneyValue;
   created_at?: ISODateTimeString;
   updated_at?: ISODateTimeString;
 }
 
 /**
  * LeaseLedgerContext
  *
  * Lease-focused display metadata used by the page header and summary panels.
  *
  * Keep this lightweight and backend-derived. The page should not guess these
  * values from other routes when the ledger payload can provide them directly.
  */
 export interface LeaseLedgerContext {
   lease_id: BillingId;
   lease_status?: string;
   rent_amount?: MoneyValue;
   due_day?: number | null;
   tenant_names?: string[];
   tenant_display?: string | null;
   building?: BillingEntitySummary | null;
   unit?: BillingEntitySummary | null;
 }
 
 /**
  * LeaseLedgerResponse
  *
  * Primary read contract for the lease ledger page.
  *
  * Current backend guidance says the payload includes:
  * - `lease_id`
  * - `totals`
  * - `charges`
  * - `payments`
  *
  * We also support optional richer fields such as `allocations` and
  * lease-context metadata so the frontend can grow without constant
  * type churn.
  */
 export interface LeaseLedgerResponse {
   lease_id: BillingId;
   totals: LeaseLedgerTotals;
   charges: LeaseLedgerCharge[];
   payments: LeaseLedgerPayment[];
   allocations?: LeaseLedgerAllocation[];
   lease?: LeaseLedgerContext;
 }
 
 /**
  * PaymentAllocationInput
  *
  * Explicit charge allocations supplied when the payment is created in
  * manual allocation mode.
  */
 export interface PaymentAllocationInput {
   charge_id: BillingId;
   amount: MoneyValue;
 }
 
 /**
  * RecordPaymentFormValues
  *
  * UI-facing request shape used by billing components and mutation hooks.
  *
  * This is the clean frontend contract. The API layer may transform it into
  * a backend transport payload if serializer field names differ.
  */
 export interface RecordPaymentFormValues {
   leaseId: BillingId;
   amount: MoneyValue;
   paidAt: ISODateString;
   method: PaymentMethod;
   externalRef?: string;
   notes?: string;
   allocationMode: AllocationMode;
   allocations?: PaymentAllocationInput[];
 }
 
 /**
  * CreatePaymentRequest
  *
  * Backend transport payload for the create-payment endpoint.
  *
  * This mirrors the stabilized billing contract shared in the handoff.
  */
 export interface CreatePaymentRequest {
   lease_id: BillingId;
   amount: MoneyValue;
   paid_at: ISODateString;
   method: PaymentMethod;
   external_ref?: string;
   notes?: string;
   allocation_mode: AllocationMode;
   allocations?: PaymentAllocationInput[];
 }
 
 /**
  * CreatePaymentResponse
  *
  * Response payload returned after a payment is successfully created.
  */
 export interface CreatePaymentResponse {
   payment_id: BillingId;
   allocation_mode: AllocationMode;
   allocated_total: MoneyValue;
   unapplied_amount: MoneyValue;
   allocation_ids: BillingId[];
 }
 
 /**
  * GenerateRentChargeFormValues
  *
  * UI-facing request shape for the "Generate Rent Charge" panel.
  *
  * We use `chargeMonth` in the frontend because it is explicit and readable.
  * The API module can translate this to `month` or `charge_month` depending
  * on the current backend serializer contract.
  */
 export interface GenerateRentChargeFormValues {
   leaseId: BillingId;
   chargeMonth: ISODateString;
 }
 
 /**
  * GenerateRentChargeRequest
  *
  * Backend transport payload used when the backend expects `charge_month`.
  */
 export interface GenerateRentChargeRequest {
   charge_month: ISODateString;
 }
 
 /**
  * LegacyGenerateRentChargeRequest
  *
  * Compatibility transport payload used if the endpoint still expects `month`
  * instead of `charge_month`.
  *
  * Keep this type until the backend contract is fully unified.
  */
 export interface LegacyGenerateRentChargeRequest {
   month: string;
 }
 
 /**
  * GenerateRentChargeResponse
  *
  * Response contract for month charge generation.
  *
  * We keep the shape tolerant because some versions of the backend may return
  * "created vs existing" metadata while others may return a serialized charge.
  */
 export interface GenerateRentChargeResponse {
   charge_id?: BillingId;
   created?: boolean;
   already_exists?: boolean;
   kind?: ChargeKind;
   amount?: MoneyValue;
   due_date?: ISODateString;
   charge_month?: ISODateString;
   status?: ChargeStatus;
   message?: string;
   [key: string]: unknown;
 }
 
 /**
  * DelinquencyLeaseSummary
  *
  * Related lease display information for delinquency reporting rows.
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
  * The backend may eventually return a richer aging structure. This interface
  * supports the stabilized reporting goals without making the table fragile.
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
  * "payments received this month." The frontend should present it exactly
  * as billing truth, not reinterpret it.
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
  * The current known shape does not require additional fields, but keeping
  * this interface gives us room for filters later without a breaking refactor.
  */
 export interface BillingDashboardSummaryQueryParams {
   asOf?: ISODateString;
 }
 
 /**
  * BillingApiErrorShape
  *
  * Lightweight shared error envelope for billing-related API calls.
  * This is useful for narrowing axios error payloads at the hook level.
  */
 export interface BillingApiErrorShape {
   error?: {
     code?: string;
     message?: string;
     details?: Record<string, unknown>;
   };
   detail?: string;
   message?: string;
 }
 
 /**
  * BillingTableEmptyState
  *
  * Optional helper union for future component-level render logic.
  * Not required immediately, but useful when wiring tables and skeletons.
  */
 export type BillingTableEmptyState =
   | "no_charges"
   | "no_payments"
   | "no_allocations"
   | "no_delinquency_rows";