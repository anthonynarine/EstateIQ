// # Filename: src/features/billing/api/types/ledger.ts


import type {
  BillingId,
  ISODateString,
  ISODateTimeString,
  MoneyValue,
} from "./primitives";
import type {
  AllocationMode,
  BillingEntitySummary,
  ChargeKind,
  ChargeStatus,
  PaymentMethod,
} from "./shared";

/**
 * LeaseLedgerTotals
 *
 * Aggregate monetary totals returned with the lease ledger payload.
 *
 * Responsibilities:
 * - represent backend-derived lease totals
 * - remain tolerant of additional backend totals over time
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
 *
 * Responsibilities:
 * - represent charge truth from the backend
 * - expose remaining balance and overdue metadata for UI rendering
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
 * Read model describing how payment value was applied to charges.
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
 * Lease-focused display metadata used by the page header and summary cards.
 *
 * Responsibilities:
 * - provide backend-derived lease display context
 * - support both nested display summaries and flat navigation ids
 */
export interface LeaseLedgerContext {
  lease_id: BillingId;
  lease_status?: string;
  rent_amount?: MoneyValue;
  due_day?: number | null;
  tenant_names?: string[];
  tenant_display?: string | null;
  building_id?: BillingId | null;
  unit_id?: BillingId | null;
  building?: BillingEntitySummary | null;
  unit?: BillingEntitySummary | null;
}

/**
 * LeaseLedgerResponse
 *
 * Primary read contract for the lease ledger page.
 *
 * Responsibilities:
 * - provide the core billing read model for the lease workspace
 * - carry totals, charges, payments, and optional richer metadata
 */
export interface LeaseLedgerResponse {
  lease_id: BillingId;
  totals: LeaseLedgerTotals;
  charges: LeaseLedgerCharge[];
  payments: LeaseLedgerPayment[];
  allocations?: LeaseLedgerAllocation[];
  lease?: LeaseLedgerContext;
}