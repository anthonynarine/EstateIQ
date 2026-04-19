// # Filename: src/features/billing/pages/leaseLedgerPage/leaseLedgerActivityUtils.ts


import type {
  LeaseLedgerAllocation,
  LeaseLedgerCharge,
  LeaseLedgerPayment,
} from "../../api/types";

/**
 * LEDGER_ACTIVITY_PAGE_SIZE
 *
 * Shared page size for the unified lease-ledger activity panel.
 *
 * Responsibilities:
 * - keep charges, payments, and allocations visually consistent
 * - centralize the page-size constant so it does not drift
 */
export const LEDGER_ACTIVITY_PAGE_SIZE = 4;

/**
 * getLedgerActivityDescription
 *
 * Returns compact helper copy for the active activity tab.
 *
 * Responsibilities:
 * - keep the header description logic out of the page component
 * - provide tab-specific user guidance
 *
 * @param tab Active ledger activity tab.
 * @returns A short description string for the active tab.
 */
export function getLedgerActivityDescription(
  tab: "charges" | "payments" | "allocations",
): string {
  if (tab === "charges") {
    return "Newest posted obligations first, including what remains open.";
  }

  if (tab === "payments") {
    return "Newest recorded receipts first, including any unapplied remainder.";
  }

  return "Newest payment-to-charge application activity first for audit and review.";
}

/**
 * getLedgerActivityItemLabel
 *
 * Returns the singular item label used by shared pagination UI.
 *
 * Responsibilities:
 * - keep pagination copy aligned with the active tab
 *
 * @param tab Active ledger activity tab.
 * @returns Singular item label for pagination.
 */
export function getLedgerActivityItemLabel(
  tab: "charges" | "payments" | "allocations",
): string {
  if (tab === "charges") {
    return "charge";
  }

  if (tab === "payments") {
    return "payment";
  }

  return "allocation";
}

/**
 * getTimestampOrMin
 *
 * Converts a date-like string into a numeric timestamp used for sorting.
 *
 * Responsibilities:
 * - safely parse date-like values
 * - push invalid or empty values to the bottom of newest-first sorts
 *
 * @param value Date-like string value.
 * @returns Parsed timestamp or Number.NEGATIVE_INFINITY.
 */
export function getTimestampOrMin(value?: string | null): number {
  if (!value?.trim()) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedTimestamp = new Date(value).getTime();

  if (Number.isNaN(parsedTimestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsedTimestamp;
}

/**
 * getChargeSortTimestamp
 *
 * Resolves the best timestamp anchor for charge ordering.
 *
 * Responsibilities:
 * - prefer charge_month for month-based billing ordering
 * - fall back to due_date when charge_month is missing
 *
 * @param charge Lease-ledger charge row.
 * @returns Numeric timestamp used in newest-first sorting.
 */
export function getChargeSortTimestamp(
  charge: LeaseLedgerCharge,
): number {
  const chargeMonthTimestamp = getTimestampOrMin(charge.charge_month);

  if (chargeMonthTimestamp !== Number.NEGATIVE_INFINITY) {
    return chargeMonthTimestamp;
  }

  return getTimestampOrMin(charge.due_date);
}

/**
 * sortChargesNewestFirst
 *
 * Returns a newest-first copy of lease charges.
 *
 * Responsibilities:
 * - sort by charge month first
 * - fall back to due date
 * - keep ordering stable with id as the final tie-breaker
 *
 * @param charges Raw ledger charge collection.
 * @returns A new newest-first charge array.
 */
export function sortChargesNewestFirst(
  charges: LeaseLedgerCharge[],
): LeaseLedgerCharge[] {
  return [...charges].sort((leftCharge, rightCharge) => {
    // Step 1: Sort primarily by the best available charge timestamp.
    const primaryDifference =
      getChargeSortTimestamp(rightCharge) -
      getChargeSortTimestamp(leftCharge);

    if (primaryDifference !== 0) {
      return primaryDifference;
    }

    // Step 2: Use due date as a secondary tie-breaker.
    const secondaryDifference =
      getTimestampOrMin(rightCharge.due_date) -
      getTimestampOrMin(leftCharge.due_date);

    if (secondaryDifference !== 0) {
      return secondaryDifference;
    }

    // Step 3: Use id for stable final ordering.
    return String(rightCharge.id).localeCompare(String(leftCharge.id));
  });
}

/**
 * sortPaymentsNewestFirst
 *
 * Returns a newest-first copy of lease payments.
 *
 * Responsibilities:
 * - sort by paid_at descending
 * - keep ordering stable with id as the final tie-breaker
 *
 * @param payments Raw ledger payment collection.
 * @returns A new newest-first payment array.
 */
export function sortPaymentsNewestFirst(
  payments: LeaseLedgerPayment[],
): LeaseLedgerPayment[] {
  return [...payments].sort((leftPayment, rightPayment) => {
    // Step 1: Sort by newest paid_at first.
    const timestampDifference =
      getTimestampOrMin(rightPayment.paid_at) -
      getTimestampOrMin(leftPayment.paid_at);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    // Step 2: Use id for stable final ordering.
    return String(rightPayment.id).localeCompare(String(leftPayment.id));
  });
}

/**
 * sortAllocationsNewestFirst
 *
 * Returns a newest-first copy of lease allocations.
 *
 * Responsibilities:
 * - sort by created_at descending
 * - keep ordering stable with id as the final tie-breaker
 *
 * @param allocations Raw ledger allocation collection.
 * @returns A new newest-first allocation array.
 */
export function sortAllocationsNewestFirst(
  allocations: LeaseLedgerAllocation[],
): LeaseLedgerAllocation[] {
  return [...allocations].sort((leftAllocation, rightAllocation) => {
    // Step 1: Sort by newest created_at first.
    const timestampDifference =
      getTimestampOrMin(rightAllocation.created_at) -
      getTimestampOrMin(leftAllocation.created_at);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    // Step 2: Use id for stable final ordering.
    return String(rightAllocation.id).localeCompare(
      String(leftAllocation.id),
    );
  });
}

/**
 * sliceLedgerRows
 *
 * Returns the visible row subset for one paginated ledger collection.
 *
 * Responsibilities:
 * - keep shared pagination math in one place
 * - avoid duplicating slice logic across charges, payments, and allocations
 *
 * @param rows Full collection.
 * @param page Current page number.
 * @returns The visible page slice.
 */
export function sliceLedgerRows<T>(rows: T[], page: number): T[] {
  const startIndex = (page - 1) * LEDGER_ACTIVITY_PAGE_SIZE;
  const endIndex = startIndex + LEDGER_ACTIVITY_PAGE_SIZE;

  return rows.slice(startIndex, endIndex);
}