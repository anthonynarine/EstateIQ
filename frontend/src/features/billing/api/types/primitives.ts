// # Filename: src/features/billing/api/types/primitives.ts

/**
 * BillingId
 *
 * Shared identifier shape for billing-domain entities.
 *
 * Responsibilities:
 * - support both integer-style ids and UUID-like string ids
 * - avoid overfitting the frontend to one backend id strategy too early
 */
export type BillingId = string | number;

/**
 * MoneyValue
 *
 * Decimal-like monetary value returned by the API.
 *
 * Responsibilities:
 * - support DRF decimal strings
 * - support local mocks or test data that may still use numbers
 */
export type MoneyValue = string | number;

/**
 * ISODateString
 *
 * Canonical string shape for date-only values.
 *
 * Examples:
 * - due_date
 * - charge_month
 * - as_of
 */
export type ISODateString = string;

/**
 * ISODateTimeString
 *
 * Canonical string shape for datetime-like values.
 *
 * Example:
 * - created_at
 * - updated_at
 */
export type ISODateTimeString = string;

/**
 * ExtensibleString
 *
 * Helper type that preserves autocomplete for known literals while still
 * allowing future backend enum expansion without immediate frontend breakage.
 *
 * @typeParam T Known literal union.
 */
export type ExtensibleString<T extends string> = T | (string & {});