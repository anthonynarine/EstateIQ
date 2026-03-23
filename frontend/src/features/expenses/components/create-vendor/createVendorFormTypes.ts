

/**
 * Local UI state for the vendor quick-create modal.
 */
export interface CreateVendorFormValues {
  name: string;
  vendor_type: string;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
}

/**
 * Validation error bag for the vendor quick-create modal.
 */
export interface CreateVendorFormErrors {
  name?: string;
}