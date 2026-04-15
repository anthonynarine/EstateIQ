
// # Filename: src/features/billing/components/chargesTableUtils.ts

import type { LeaseLedgerCharge, MoneyValue } from "../../api/billingTypes";

/**
 * formatCurrencyValue
 *
 * Formats money-like API values into a USD display string.
 *
 * @param value Monetary value from the billing read model.
 * @returns A formatted USD currency string or placeholder.
 */
export function formatCurrencyValue(value?: MoneyValue): string {
  // Step 1: Guard empty values.
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  // Step 2: Parse the incoming amount.
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "—";
  }

  // Step 3: Return the formatted currency value.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

/**
 * getNumericMoneyValue
 *
 * Converts a money-like value into a safe number for UI state decisions.
 *
 * @param value Monetary value from the billing payload.
 * @returns Parsed numeric value or null.
 */
export function getNumericMoneyValue(value?: MoneyValue): number | null {
  // Step 1: Guard empty values.
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Step 2: Parse and validate the value.
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * formatDateValue
 *
 * Converts a raw date string into a readable localized date.
 *
 * @param value Date-like string from the billing payload.
 * @returns A readable date label or placeholder.
 */
export function formatDateValue(value?: string | null): string {
  // Step 1: Guard blank values.
  if (!value?.trim()) {
    return "—";
  }

  // Step 2: Parse the date.
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // Step 3: Return a compact readable date.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * formatMonthValue
 *
 * Formats a charge-month date into a compact month/year label.
 *
 * @param value Charge month string.
 * @returns Compact month display or placeholder.
 */
export function formatMonthValue(value?: string | null): string {
  // Step 1: Guard blank values.
  if (!value?.trim()) {
    return "—";
  }

  // Step 2: Parse the date.
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  // Step 3: Return a compact month/year label.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * formatChargeKindLabel
 *
 * Converts a backend charge kind into a human-readable label.
 *
 * @param kind Raw charge kind value.
 * @returns A display-safe label.
 */
export function formatChargeKindLabel(kind: string): string {
  // Step 1: Normalize the incoming kind.
  const normalizedKind = kind.trim();

  if (!normalizedKind) {
    return "Unknown";
  }

  // Step 2: Convert snake_case to Title Case.
  return normalizedKind
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * isChargePayable
 *
 * Determines whether a charge row should expose the row-level Pay action.
 *
 * Rule:
 * - void charges are not payable
 * - only rows with remaining balance > 0 are payable
 *
 * @param charge Charge row from the lease ledger payload.
 * @returns True when the charge can accept payment.
 */
export function isChargePayable(charge: LeaseLedgerCharge): boolean {
  // Step 1: Block void charges.
  if (charge.status === "void") {
    return false;
  }

  // Step 2: Require a positive remaining balance.
  const remainingBalance = getNumericMoneyValue(charge.remaining_balance);

  return remainingBalance !== null && remainingBalance > 0;
}

/**
 * getChargeDisplayState
 *
 * Builds a calmer, user-facing display state for a charge row.
 *
 * @param charge Charge row from the lease ledger payload.
 * @returns Display state label and classes.
 */
export function getChargeDisplayState(charge: LeaseLedgerCharge): {
  label: string;
  classes: string;
} {
  // Step 1: Resolve numeric values for display decisions.
  const remainingBalance = getNumericMoneyValue(charge.remaining_balance);
  const totalAmount = getNumericMoneyValue(charge.amount);

  // Step 2: Handle void rows first.
  if (charge.status === "void") {
    return {
      label: "Void",
      classes: "border border-rose-400/20 bg-rose-400/10 text-rose-100",
    };
  }

  // Step 3: Fully settled rows are paid.
  if (remainingBalance !== null && remainingBalance <= 0) {
    return {
      label: "Paid",
      classes:
        "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    };
  }

  // Step 4: Partial balance remaining gets a clearer operational label.
  if (
    remainingBalance !== null &&
    totalAmount !== null &&
    remainingBalance > 0 &&
    remainingBalance < totalAmount
  ) {
    return {
      label: "Partial",
      classes: "border border-sky-400/20 bg-sky-400/10 text-sky-100",
    };
  }

  // Step 5: Overdue rows should still read clearly for operators.
  if (charge.is_overdue) {
    return {
      label: "Overdue",
      classes: "border border-amber-400/20 bg-amber-400/10 text-amber-100",
    };
  }

  // Step 6: Default operational label for open unpaid charges.
  return {
    label: "Open",
    classes: "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  };
}

/**
 * getChargeDesktopPreview
 *
 * Builds a compact one-line charge preview for desktop.
 *
 * @param charge Charge row from the lease ledger payload.
 * @returns A compact preview string or null.
 */
export function getChargeDesktopPreview(
  charge: LeaseLedgerCharge,
): string | null {
  // Step 1: Prefer charge month when available.
  if (charge.charge_month) {
    return formatMonthValue(charge.charge_month);
  }

  // Step 2: Fall back to notes.
  if (charge.notes?.trim()) {
    return charge.notes.trim();
  }

  return null;
}

/**
 * getChargeMobileSecondaryText
 *
 * Produces a slightly richer supporting line for mobile cards.
 *
 * @param charge Charge row from the billing payload.
 * @returns Supporting text or null.
 */
export function getChargeMobileSecondaryText(
  charge: LeaseLedgerCharge,
): string | null {
  // Step 1: Prefer month-based wording for rent charges.
  if (charge.charge_month) {
    return `Rent charge for ${formatMonthValue(charge.charge_month)}`;
  }

  // Step 2: Fall back to notes.
  if (charge.notes?.trim()) {
    return charge.notes.trim();
  }

  return null;
}