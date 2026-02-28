// # Filename: src/api/formatApiFormErrors.ts

export type ApiFieldErrors = Record<string, string[]>;

export type ApiFormErrors = {
  fieldErrors: ApiFieldErrors;
  formErrors: string[];
};

/**
 * formatApiFormErrors
 *
 * Converts DRF-ish error responses into:
 * - fieldErrors: {"end_date": ["..."], "rent_amount": ["..."]}
 * - formErrors: ["..."] from non_field_errors/detail
 */
export function formatApiFormErrors(error: unknown): ApiFormErrors {
  // Step 1: Axios-ish shape
  const anyErr = error as any;
  const data = anyErr?.response?.data;

  const fallback: ApiFormErrors = {
    fieldErrors: {},
    formErrors: ["Something went wrong. Please try again."],
  };

  if (!data) {
    const msg = anyErr?.message;
    return {
      fieldErrors: {},
      formErrors: [typeof msg === "string" && msg.trim() ? msg : fallback.formErrors[0]],
    };
  }

  // Step 2: string/array responses
  if (typeof data === "string") return { fieldErrors: {}, formErrors: [data] };
  if (Array.isArray(data)) return { fieldErrors: {}, formErrors: data.map(String) };

  // Step 3: object responses (DRF typical)
  const fieldErrors: ApiFieldErrors = {};
  const formErrors: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const messages = Array.isArray(value) ? value.map(String) : [String(value)];
    if (key === "non_field_errors" || key === "detail") formErrors.push(...messages);
    else fieldErrors[key] = messages;
  }

  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) return fallback;
  return { fieldErrors, formErrors };
}