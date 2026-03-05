// # Filename: src/api/formatApiError.ts

type StructuredErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export function formatApiError(error: unknown): string {
  // Step 1: Axios errors usually have response/status/data
  const anyErr = error as any;

  const status: number | undefined = anyErr?.response?.status;
  const data: unknown = anyErr?.response?.data;

  // Step 2: Prefer your structured envelope: { error: { code, message, details } }
  const envelope =
    data && typeof data === "object" ? (data as StructuredErrorEnvelope) : null;

  const structured = envelope?.error;
  const structuredMsg =
    structured && typeof structured === "object"
      ? (() => {
          const code = typeof structured.code === "string" ? structured.code : "";
          const message =
            typeof structured.message === "string" ? structured.message : "";
          if (message && code) return `${message} (${code})`;
          if (message) return message;
          if (code) return `Request failed (${code})`;
          return "";
        })()
      : "";

  // Step 3: Normalize common DRF shapes (fallback)
  const detail =
    structuredMsg ||
    (data as any)?.detail ||
    (data as any)?.non_field_errors ||
    data ||
    anyErr?.message ||
    "Unknown error";

  const detailText =
    typeof detail === "string" ? detail : JSON.stringify(detail);

  // Step 4: Provide helpful guidance for auth/tenant issues
  if (status === 401) {
    return `HTTP 401 Unauthorized: ${detailText}. Your access token may be expired and refresh failed.`;
  }
  if (status === 403) {
    return `HTTP 403 Forbidden: ${detailText}. Check org access and ensure X-Org-Slug is set correctly.`;
  }
  if (status === 400) {
    return `HTTP 400 Bad Request: ${detailText}. This is usually a validation error (missing/invalid fields).`;
  }

  return `${status ? `HTTP ${status}: ` : ""}${detailText}`;
}