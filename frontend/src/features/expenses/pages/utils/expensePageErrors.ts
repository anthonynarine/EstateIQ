// # Filename: src/features/expenses/pages/utils/expensePageErrors.ts


/**
 * Safely extracts a readable error message from unknown error input.
 *
 * Supports:
 * - standard Error instances
 * - Axios-like `response.data.detail`
 * - Axios-like `response.data.message`
 * - Axios-like `response.data.non_field_errors`
 *
 * @param error Unknown thrown value.
 * @param fallbackMessage Message used when no better error can be derived.
 * @returns User-friendly error string.
 */
export function getExpensePageErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  // # Step 1: Handle empty error input.
  if (!error) {
    return fallbackMessage;
  }

  // # Step 2: Handle standard Error instances.
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // # Step 3: Handle Axios-like nested API errors.
  const maybeError = error as {
    response?: {
      data?: {
        detail?: string;
        message?: string;
        non_field_errors?: string[];
      };
    };
  };

  const detailMessage = maybeError.response?.data?.detail;
  if (detailMessage) {
    return detailMessage;
  }

  const apiMessage = maybeError.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  const nonFieldErrors = maybeError.response?.data?.non_field_errors;
  if (nonFieldErrors?.length) {
    return nonFieldErrors.join(", ");
  }

  return fallbackMessage;
}