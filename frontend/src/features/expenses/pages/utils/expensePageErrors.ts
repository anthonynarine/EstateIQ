// # Filename: src/features/expenses/pages/utils/expensePageErrors.ts

import { isAxiosError } from "axios";

/**
 * Extracts a page-friendly error message from an unknown thrown value.
 *
 * @param error Unknown error value.
 * @param fallbackMessage Fallback message when nothing useful can be extracted.
 * @returns Best available human-readable message.
 */
export function getExpensePageErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  // # Step 1: Handle axios-shaped errors.
  if (isAxiosError(error)) {
    const responseData = error.response?.data as
      | {
          detail?: string;
          message?: string;
          non_field_errors?: string[];
        }
      | undefined;

    if (typeof responseData?.detail === "string" && responseData.detail.trim()) {
      return responseData.detail;
    }

    if (
      typeof responseData?.message === "string" &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }

    if (
      Array.isArray(responseData?.non_field_errors) &&
      responseData.non_field_errors.length > 0
    ) {
      return responseData.non_field_errors.join(", ");
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  // # Step 2: Handle native Error objects.
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  // # Step 3: Fall back to the provided message.
  return fallbackMessage;
}