// # Filename: src/api/formatApiFormErrors.ts

export type ApiFieldErrors = Record<string, string[]>;

export type ApiFormErrors = {
  fieldErrors: ApiFieldErrors;
  formErrors: string[];
};

/**
 * formatApiFormErrors
 *
 * Normalize API errors (Axios + DRF-style responses) into a single, consistent shape
 * for form rendering:
 *
 * - fieldErrors: maps fieldName -> list of messages (e.g. { rent_amount: ["..."] })
 * - formErrors: non-field/global messages (e.g. ["Session expired..."])
 *
 * Supported backends/shapes:
 * - DRF field errors: { field: ["msg"] }
 * - DRF non-field errors: { non_field_errors: ["msg"] }
 * - DRF detail: { detail: "msg" } or { detail: ["msg"] }
 * - Custom: { _error: "msg" } or { _error: ["msg"] }
 * - String response body: "msg"
 * - Array response body: ["msg1", "msg2"]
 *
 * UX rules:
 * - 401 -> "Session expired, please log in again."
 * - If nothing structured exists -> a safe fallback message
 */
export function formatApiFormErrors(error: unknown): ApiFormErrors {
  // Step 1: Axios-ish shape
  const anyErr = error as any;
  const status: number | undefined = anyErr?.response?.status;
  const data = anyErr?.response?.data;

  // Step 2: Friendly auth messaging (avoid raw HTTP noise)
  if (status === 401) {
    return {
      fieldErrors: {},
      formErrors: ["Session expired, please log in again."],
    };
  }

  const fallbackMsg = "Something went wrong. Please try again.";

  // Step 3: No response body -> use error.message if available
  if (data == null) {
    const msg = anyErr?.message;
    return {
      fieldErrors: {},
      formErrors: [typeof msg === "string" && msg.trim() ? msg : fallbackMsg],
    };
  }

  // Step 4: string/array responses
  if (typeof data === "string") {
    return { fieldErrors: {}, formErrors: [data] };
  }
  if (Array.isArray(data)) {
    return { fieldErrors: {}, formErrors: data.map(String) };
  }

  // Step 5: object responses (DRF typical)
  if (typeof data !== "object") {
    return { fieldErrors: {}, formErrors: [fallbackMsg] };
  }

  const fieldErrors: ApiFieldErrors = {};
  const formErrors: string[] = [];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const messages = Array.isArray(value) ? value.map(String) : [String(value)];

    if (key === "non_field_errors" || key === "detail" || key === "_error") {
      formErrors.push(...messages);
    } else {
      fieldErrors[key] = messages;
    }
  }

  // Step 6: Final fallback if somehow empty
  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    return { fieldErrors: {}, formErrors: [fallbackMsg] };
  }

  return { fieldErrors, formErrors };
}