// # Filename: src/features/expenses/reporting/utils/reportingDebug.ts


/**
 * Small set of accepted truthy values for env-based debug toggles.
 */
const TRUTHY_DEBUG_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * Returns whether reporting debug logging is enabled.
 *
 * Rules:
 * - only enabled in development
 * - optionally enabled with `VITE_ENABLE_REPORTING_DEBUG=true`
 *
 * @returns True when reporting debug logs should be emitted.
 */
export function isReportingDebugEnabled(): boolean {
  // # Step 1: Never emit reporting logs outside development.
  if (!import.meta.env.DEV) {
    return false;
  }

  // # Step 2: Read the optional reporting debug flag from Vite env.
  const rawFlag = String(
    import.meta.env.VITE_ENABLE_REPORTING_DEBUG ?? "",
  ).trim().toLowerCase();

  // # Step 3: Enable when the env flag is explicitly truthy.
  return TRUTHY_DEBUG_VALUES.has(rawFlag);
}

/**
 * Emits a scoped reporting debug log when enabled.
 *
 * @param label Short log label.
 * @param value Optional value to inspect.
 * @returns Void.
 */
export function reportDebug(label: string, value?: unknown): void {
  // # Step 1: Skip all work when reporting debug is disabled.
  if (!isReportingDebugEnabled()) {
    return;
  }

  // # Step 2: Emit a consistently-scoped debug message.
  console.log(`[expenses-reporting] ${label}`, value);
}

/**
 * Emits a normalized point comparison log.
 *
 * This is useful when debugging selector transforms:
 * raw backend point -> normalized UI-safe point.
 *
 * @param label Short transform label.
 * @param raw Raw backend point.
 * @param normalized Normalized UI-safe point.
 * @returns Void.
 */
export function reportNormalizedPoint(
  label: string,
  raw: unknown,
  normalized: unknown,
): void {
  // # Step 1: Skip all work when reporting debug is disabled.
  if (!isReportingDebugEnabled()) {
    return;
  }

  // # Step 2: Emit a compact comparison object.
  console.log(`[expenses-reporting] ${label}`, {
    raw,
    normalized,
  });
}

/**
 * Emits numeric key-resolution diagnostics for reporting points.
 *
 * This is the key helper for debugging "label shows up but total is 0"
 * contract mismatches.
 *
 * @param label Short diagnostic label.
 * @param candidateKeys Keys checked in priority order.
 * @param resolvedKey Final matched key, if any.
 * @param resolvedValue Final matched raw value.
 * @param point Raw source point.
 * @returns Void.
 */
export function reportResolvedField(
  label: string,
  candidateKeys: string[],
  resolvedKey: string | null,
  resolvedValue: unknown,
  point: unknown,
): void {
  // # Step 1: Skip all work when reporting debug is disabled.
  if (!isReportingDebugEnabled()) {
    return;
  }

  // # Step 2: Emit a targeted contract-resolution log.
  console.log(`[expenses-reporting] ${label}`, {
    candidateKeys,
    resolvedKey,
    resolvedValue,
    point,
  });
}