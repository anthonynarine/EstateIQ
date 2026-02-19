// # Filename: src/api/formatApiError.ts


export function formatApiError(error: unknown): string {
    // Step 1: Axios errors usually have response/status/data
    const anyErr = error as any;
  
    const status: number | undefined = anyErr?.response?.status;
    const data = anyErr?.response?.data;
  
    // Step 2: Normalize common DRF shapes
    const detail =
      data?.detail ??
      data?.non_field_errors ??
      data ??
      anyErr?.message ??
      "Unknown error";
  
    const detailText = typeof detail === "string" ? detail : JSON.stringify(detail);
  
    // Step 3: Provide helpful guidance for auth/tenant issues
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
  