// # Filename: src/features/tenancy/utils/getHttpErrorHint.ts

/**
 * getHttpErrorHint
 *
 * Maps common API HTTP statuses into "where/why/fix" hints.
 * Keeps pages clean while still being production-support friendly.
 */
 export function getHttpErrorHint(status?: number): string | null {
    // Step 1: No status -> no hint
    if (!status) return null;
  
    // Step 2: Auth/session problems
    if (status === 401) {
      return "401 Unauthorized: token may be expired. If refresh failed, you may have been logged out.";
    }
    if (status === 403) {
      return "403 Forbidden: you may not have access to this org, or X-Org-Slug is missing/incorrect.";
    }
  
    // Step 3: Not found / routing problems
    if (status === 404) {
      return "404 Not Found: unit may not exist OR /api/v1/units/:id/leases/ isn't registered on backend.";
    }
  
    // Step 4: Validation problems
    if (status === 400) {
      return "400 Bad Request: check required fields, unitId, and request payload format.";
    }
  
    return null;
  }
  