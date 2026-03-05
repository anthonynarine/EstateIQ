// # Filename: src/api/formatApiFormErrors.ts

export type ApiFieldErrors = Record<string, string[]>;

export type LeaseOverlapMeta = {
  kind: "lease_overlap";
  conflict: {
    lease_id: number;
    start_date: string;
    end_date: string | null;
    status: string;
  };
  suggestedStartDate: string | null;
};

export type ApiFormErrors = {
  fieldErrors: ApiFieldErrors;
  formErrors: string[];
  meta?: LeaseOverlapMeta;
};

type StructuredErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

type LeaseConflict = {
  lease_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
};

function toStringSafe(v: unknown): string {
  // Step 1: Convert unknown -> string safely
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractStructuredError(
  data: unknown
): StructuredErrorEnvelope["error"] | null {
  // Step 1: Validate shape
  if (!data || typeof data !== "object") return null;
  const err = (data as StructuredErrorEnvelope).error;
  if (!err || typeof err !== "object") return null;
  return err;
}

function formatStructuredErrorMessage(
  err: NonNullable<ReturnType<typeof extractStructuredError>>
): string | null {
  // Step 1: Prefer message
  const message = typeof err.message === "string" ? err.message.trim() : "";
  const code = typeof err.code === "string" ? err.code.trim() : "";

  if (message && code) return `${message} (${code})`;
  if (message) return message;
  if (code) return `Request failed (${code})`;
  return null;
}

function extractLeaseConflictFromEnvelope(
  err: NonNullable<ReturnType<typeof extractStructuredError>>
): { conflict: LeaseConflict; suggestedStart?: string | null } | null {
  // Step 1: Pull from err.details.conflict
  const details = err.details;
  if (!details || typeof details !== "object") return null;

  const conflict = (details as any).conflict as LeaseConflict | undefined;
  if (!conflict?.lease_id) return null;

  const suggested = (details as any).suggested_start_date as
    | string
    | null
    | undefined;

  return { conflict, suggestedStart: suggested ?? null };
}

// Step 1: Format YYYY-MM-DD as "May 4, 2026" in a stable way.
// Uses a UTC-safe parse so it doesn't drift a day in some timezones.
function formatIsoDateForUi(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate; // fallback to raw if unexpected format

  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1; // 0-based
  const day = Number(m[3]);

  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatLeaseConflictMessage(
  conflict: LeaseConflict,
  suggestedStart?: string | null
): string {
  // Step 1: Raw dates for fallback logic
  const nextAvailableRaw = suggestedStart ?? conflict.end_date ?? null;

  // Step 2: Pretty dates for UI
  const startPretty = formatIsoDateForUi(conflict.start_date) ?? conflict.start_date;
  const endPretty = conflict.end_date
    ? formatIsoDateForUi(conflict.end_date) ?? conflict.end_date
    : "open-ended";
  const nextPretty = nextAvailableRaw
    ? formatIsoDateForUi(nextAvailableRaw) ?? nextAvailableRaw
    : null;

  // Step 3: Enterprise-style message
  if (nextAvailableRaw && nextPretty) {
    return `Unit unavailable until ${nextPretty} (Lease #${conflict.lease_id}: ${startPretty} → ${endPretty}). Choose a start date on or after ${nextPretty}.`;
  }

  return `This unit is reserved by Lease #${conflict.lease_id} (${startPretty} → ${endPretty}). To create a new lease, first set an end date for the existing lease.`;
}

/**
 * formatApiFormErrors
 *
 * Normalize API errors (Axios + DRF-style responses) into:
 * - fieldErrors: maps fieldName -> list of messages
 * - formErrors: non-field/global messages
 * - meta: optional structured payload for richer UX (lease_overlap)
 */
export function formatApiFormErrors(error: unknown): ApiFormErrors {
  // Step 1: Axios-ish shape
  const anyErr = error as any;
  const status: number | undefined = anyErr?.response?.status;
  const data = anyErr?.response?.data;

  // Step 2: Friendly auth messaging
  if (status === 401) {
    return {
      fieldErrors: {},
      formErrors: ["Session expired, please log in again."],
    };
  }

  const fallbackMsg = "Something went wrong. Please try again.";

  // Step 3: No response body
  if (data == null) {
    const msg = anyErr?.message;
    return {
      fieldErrors: {},
      formErrors: [typeof msg === "string" && msg.trim() ? msg : fallbackMsg],
    };
  }

  // Step 4: string/array responses
  if (typeof data === "string") return { fieldErrors: {}, formErrors: [data] };
  if (Array.isArray(data)) {
    return { fieldErrors: {}, formErrors: data.map(String) };
  }

  // Step 5: object responses
  if (typeof data !== "object") {
    return { fieldErrors: {}, formErrors: [fallbackMsg] };
  }

  // Step 5a: Handle structured { error: { code, message, details } } envelope
  const structured = extractStructuredError(data);

  if (structured) {
    const code = typeof structured.code === "string" ? structured.code : "";

    // Step 5a.1: lease_overlap -> message + meta
    if (code === "lease_overlap") {
      const conflictInfo = extractLeaseConflictFromEnvelope(structured);

      if (conflictInfo) {
        return {
          fieldErrors: {},
          formErrors: [
            formatLeaseConflictMessage(
              conflictInfo.conflict,
              conflictInfo.suggestedStart
            ),
          ],
          meta: {
            kind: "lease_overlap",
            conflict: conflictInfo.conflict,
            suggestedStartDate: conflictInfo.suggestedStart ?? null,
          },
        };
      }
    }

    // Step 5a.2: Map certain codes to a specific field for better UX
    const message =
      typeof structured.message === "string" ? structured.message : "";

    if (code === "invalid_date_range" && message) {
      return { fieldErrors: { end_date: [message] }, formErrors: [] };
    }

    // Step 5a.3: Otherwise show as a form-level error
    const msg = formatStructuredErrorMessage(structured);
    if (msg) return { fieldErrors: {}, formErrors: [msg] };
  }

  // Step 6: Generic DRF field/non-field parsing
  const fieldErrors: ApiFieldErrors = {};
  const formErrors: string[] = [];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const messages = Array.isArray(value)
      ? value.map(toStringSafe)
      : [toStringSafe(value)];

    if (key === "non_field_errors" || key === "detail" || key === "_error") {
      formErrors.push(...messages.filter(Boolean));
    } else {
      fieldErrors[key] = messages.filter(Boolean);
    }
  }

  // Step 7: Final fallback if empty
  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    return { fieldErrors, formErrors: [fallbackMsg] };
  }

  return { fieldErrors, formErrors };
}