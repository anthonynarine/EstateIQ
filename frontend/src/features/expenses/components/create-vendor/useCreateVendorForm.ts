
import { useMemo, useState } from "react";

import type { CreateVendorPayload } from "../../api/expensesTypes";
import type {
  CreateVendorFormErrors,
  CreateVendorFormValues,
} from "./createVendorFormTypes";

const INITIAL_VALUES: CreateVendorFormValues = {
  name: "",
  vendor_type: "",
  contact_name: "",
  email: "",
  phone: "",
  notes: "",
};

/**
 * Manages local state and validation for the vendor quick-create modal.
 *
 * This hook intentionally stays UI-local:
 * - it owns transient input state
 * - it validates required fields before API submission
 * - it builds the backend payload shape
 *
 * API execution stays outside this hook so the parent orchestration layer
 * can decide how to handle cache invalidation and post-create selection.
 *
 * @returns Modal form state and helpers.
 */
export function useCreateVendorForm() {
  const [values, setValues] = useState<CreateVendorFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<CreateVendorFormErrors>({});

  const isDirty = useMemo(() => {
    return Object.values(values).some((value) => value.trim() !== "");
  }, [values]);

  /**
   * Updates a single field inside the local vendor form.
   *
   * @param field Vendor form field key.
   * @param value New string value.
   */
  const updateField = (
    field: keyof CreateVendorFormValues,
    value: string,
  ) => {
    // # Step 1: Update the targeted field.
    setValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }));

    // # Step 2: Clear field-specific error once the user edits it.
    setErrors((previousErrors) => {
      if (!(field in previousErrors)) {
        return previousErrors;
      }

      return {
        ...previousErrors,
        [field]: undefined,
      };
    });
  };

  /**
   * Resets the modal form back to its initial state.
   */
  const resetForm = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
  };

  /**
   * Validates the modal form and returns the normalized backend payload.
   *
   * @returns Normalized vendor payload when valid, otherwise null.
   */
  const buildPayload = (): CreateVendorPayload | null => {
    const trimmedName = values.name.trim();

    // # Step 3: Enforce required name before hitting the API.
    if (!trimmedName) {
      setErrors({
        name: "Vendor name is required.",
      });
      return null;
    }

    // # Step 4: Clear any stale validation errors before submit.
    setErrors({});

    return {
      name: trimmedName,
      vendor_type: values.vendor_type.trim(),
      contact_name: values.contact_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
      is_active: true,
    };
  };

  return {
    values,
    errors,
    isDirty,
    updateField,
    resetForm,
    buildPayload,
  };
}