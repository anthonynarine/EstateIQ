// # Filename: src/features/expenses/components/ExpenseReportingSection/reportingFormatters.ts


/**
 * Safely formats money-like values for reporting display.
 *
 * The backend may serialize Decimal values as strings or numbers.
 *
 * @param value Money-like API value.
 * @returns A user-friendly USD currency string.
 */
 export function formatCurrency(
    value: string | number | null | undefined,
  ): string {
    // # Step 1: Normalize missing values.
    if (value === null || value === undefined || value === "") {
      return "$0.00";
    }
  
    // # Step 2: Convert the incoming value into a number.
    const numericValue =
      typeof value === "number" ? value : Number.parseFloat(value);
  
    // # Step 3: Guard against malformed values.
    if (Number.isNaN(numericValue)) {
      return "$0.00";
    }
  
    // # Step 4: Return a localized USD currency string.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numericValue);
  }
  
  /**
   * Safely formats number-like values for reporting display.
   *
   * @param value Numeric-like API value.
   * @returns A localized number string.
   */
  export function formatNumber(
    value: string | number | null | undefined,
  ): string {
    // # Step 1: Normalize missing values.
    if (value === null || value === undefined || value === "") {
      return "0";
    }
  
    // # Step 2: Convert the incoming value into a number.
    const numericValue =
      typeof value === "number" ? value : Number.parseFloat(value);
  
    // # Step 3: Guard against malformed values.
    if (Number.isNaN(numericValue)) {
      return "0";
    }
  
    // # Step 4: Return a localized number string.
    return new Intl.NumberFormat("en-US").format(numericValue);
  }