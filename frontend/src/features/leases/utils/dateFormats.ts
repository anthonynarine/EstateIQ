// # Filename: src/features/leases/utils/dateFormat.ts

/**
 * dateFormat
 *
 * UTC-safe YYYY-MM-DD formatting helpers.
 * We parse "YYYY-MM-DD" into a UTC Date to avoid timezone drift.
 */

 function parseIsoYmdToUtcDate(isoDate: string): Date | null {
    // Step 1: Validate input format strictly
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!m) return null;
  
    // Step 2: Convert to numbers
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1; // 0-based
    const day = Number(m[3]);
  
    // Step 3: Construct UTC date (stable across timezones)
    return new Date(Date.UTC(year, monthIndex, day));
  }
  
  export function formatIsoDateLong(isoDate: string): string {
    // Step 1: Parse date safely
    const d = parseIsoYmdToUtcDate(isoDate);
    if (!d) return isoDate;
  
    // Step 2: Format (long month)
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  
  export function formatIsoDateShort(isoDate: string): string {
    // Step 1: Parse date safely
    const d = parseIsoYmdToUtcDate(isoDate);
    if (!d) return isoDate;
  
    // Step 2: Format (short month)
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }